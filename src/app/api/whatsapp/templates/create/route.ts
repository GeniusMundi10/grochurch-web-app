import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MEDIA_HEADER_TYPES = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

const inferFileNameFromUrl = (url: string, fallback: string): string => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    if (!name) return fallback;
    return name;
  } catch {
    const sanitized = url.split("?")[0];
    const name = sanitized.split("/").filter(Boolean).pop();
    return name || fallback;
  }
};

const uploadHeaderMediaToMeta = async (
  mediaUrl: string,
  headerType: "IMAGE" | "VIDEO" | "DOCUMENT",
  wabaId: string,
  businessToken: string
): Promise<{ handle: string; fileName: string; contentType: string; blob: Blob }> => {
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error("Failed to download header media from storage");
  }

  const arrayBuffer = await response.arrayBuffer();
  let contentType = response.headers.get("content-type") || "";

  // CRITICAL: Meta strictly expects explicit image/jpeg, image/png, video/mp4 etc.
  // If Supabase returns application/octet-stream or similar, Meta throws "(#100) Invalid parameter".
  // Force clean mime types here.
  if (headerType === "IMAGE") {
    contentType = contentType.includes("png") ? "image/png" : "image/jpeg";
  } else if (headerType === "VIDEO") {
    contentType = "video/mp4";
  } else if (headerType === "DOCUMENT") {
    contentType = "application/pdf";
  }

  const fileName = inferFileNameFromUrl(mediaUrl, `sample.${headerType.toLowerCase()}`);

  const APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
  if (!APP_ID) {
    throw new Error("NEXT_PUBLIC_FB_APP_ID not configured");
  }

  const blob = new Blob([arrayBuffer], { type: contentType });

  // Step 1: Start upload session using Resumable Upload API
  const sessionParams = new URLSearchParams({
    file_name: fileName,
    file_length: arrayBuffer.byteLength.toString(),
    file_type: contentType,
    access_token: businessToken
  });

  const sessionResponse = await fetch(
    `https://graph.facebook.com/v19.0/${APP_ID}/uploads?${sessionParams}`,
    { method: "POST" }
  );

  const sessionData = await sessionResponse.json().catch(() => ({}));
  const uploadSessionId = sessionData?.id?.replace("upload:", "");

  if (!sessionResponse.ok || !uploadSessionId) {
    console.error("[Meta Upload] Resumable Session Error:", JSON.stringify(sessionData, null, 2));
    throw new Error(sessionData?.error?.message || "Failed to start upload session");
  }

  // Step 2: Upload file data
  const uploadResponse = await fetch(
    `https://graph.facebook.com/v19.0/upload:${uploadSessionId}`,
    {
      method: "POST",
      headers: {
        Authorization: `OAuth ${businessToken}`,
        file_offset: "0"
      },
      body: arrayBuffer
    }
  );

  const uploadData = await uploadResponse.json().catch(() => ({}));
  const handleId = uploadData?.h;

  if (!uploadResponse.ok || !handleId) {
    console.error("[Meta Upload] Resumable Upload Error:", JSON.stringify(uploadData, null, 2));
    throw new Error(uploadData?.error?.message || "Failed to upload header media sample to Meta");
  }

  return {
    handle: String(handleId),
    fileName,
    contentType,
    blob
  };
};

const uploadHeaderMediaAttachment = async (
  blob: Blob,
  headerType: "IMAGE" | "VIDEO" | "DOCUMENT",
  phoneNumberId: string,
  businessToken: string,
  fileName: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", headerType.toLowerCase());
  formData.append("file", blob, fileName);

  const mediaResponse = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${businessToken}`
    },
    body: formData
  });

  const mediaData = await mediaResponse.json().catch(() => ({}));
  const mediaId = mediaData?.id;

  if (!mediaResponse.ok || !mediaId) {
    console.error("[Meta Upload] Media API Error:", JSON.stringify(mediaData, null, 2));
    throw new Error(mediaData?.error?.message || "Failed to upload header media attachment to Meta");
  }

  return String(mediaId);
};

/**
 * POST /api/whatsapp/templates/create
 * Creates a new WhatsApp message template and submits it to Meta for approval
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      ai_id,
      template_name,
      category,
      language = 'en_US',
      body_text,
      header_type,
      header_text,
      header_media_url,
      footer_text,
      body_examples,
      parameter_format,
      button_type,
      buttons
    } = body;

    console.log(`[Templates Create] Received: template_name=${template_name}, header_type=${header_type}, header_media_url=${header_media_url ? header_media_url.substring(0, 80) + '...' : 'NULL/EMPTY'}`);

    // Validate required fields
    if (!ai_id || !template_name || !category || !body_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: ai_id, template_name, category, body_text" },
        { status: 400 }
      );
    }

    // Validate ai_id belongs to user
    const { data: bizInfo } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", ai_id)
      .maybeSingle();

    if (!bizInfo?.id) {
      return NextResponse.json(
        { success: false, error: "Invalid ai_id for user" },
        { status: 403 }
      );
    }

    // Check if template name already exists for this user/ai
    const { data: existing } = await supabase
      .from("whatsapp_templates")
      .select("id")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .eq("template_name", template_name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Template "${template_name}" already exists for this AI` },
        { status: 409 }
      );
    }

    // Get WhatsApp integration credentials
    const { data: integration } = await supabase
      .from("whatsapp_integrations")
      .select("waba_id, business_token, phone_number_id")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .maybeSingle();

    if (!integration?.waba_id || !integration?.business_token) {
      return NextResponse.json(
        { success: false, error: "WhatsApp integration not found for this AI" },
        { status: 404 }
      );
    }

    const components: any[] = [];
    let headerUploadHandle: string | null = null;
    let headerMediaMeta: { handle: string; fileName: string; contentType: string; blob: Blob } | null = null;
    let headerMediaAttachmentId: string | null = null;

    if (header_type && MEDIA_HEADER_TYPES.has(header_type) && header_media_url) {
      try {
        headerMediaMeta = await uploadHeaderMediaToMeta(
          header_media_url,
          header_type as "IMAGE" | "VIDEO" | "DOCUMENT",
          integration.waba_id,
          integration.business_token
        );
        headerUploadHandle = headerMediaMeta.handle;

        if (!integration.phone_number_id) {
          throw new Error("WhatsApp phone_number_id missing for media upload");
        }

        headerMediaAttachmentId = await uploadHeaderMediaAttachment(
          headerMediaMeta.blob,
          header_type as "IMAGE" | "VIDEO" | "DOCUMENT",
          integration.phone_number_id,
          integration.business_token,
          headerMediaMeta.fileName
        );
      } catch (uploadError: any) {
        console.error("[Templates] Header sample upload failed", uploadError);
        return NextResponse.json(
          { success: false, error: uploadError?.message || "Failed to provide sample media for header" },
          { status: 400 }
        );
      }
    }

    // Build Meta API template payload
    if (header_type && (header_text || header_media_url)) {
      const headerComponent: any = { type: "HEADER" };

      if (header_type === "TEXT" && header_text) {
        headerComponent.format = "TEXT";
        headerComponent.text = header_text;
      } else if (MEDIA_HEADER_TYPES.has(header_type) && header_media_url) {
        headerComponent.format = header_type;
        if (headerUploadHandle) {
          headerComponent.example = { header_handle: [headerUploadHandle] };
        }
      }

      components.push(headerComponent);
    }

    // Add body component (required)
    const bodyComponent: any = {
      type: "BODY",
      text: body_text
    };

    const bodyExampleValues = Array.isArray(body_examples) ? body_examples.filter((value) => typeof value === "string" && value.trim() !== "") : [];
    const normalizedParameterFormat = typeof parameter_format === "string" ? parameter_format.toLowerCase() : null;

    if (bodyExampleValues.length > 0) {
      if (normalizedParameterFormat === "named") {
        bodyComponent.example = {
          body_text_named_params: bodyExampleValues.map((example) => {
            const [paramName, paramValue] = example.split(":");
            if (!paramName || typeof paramValue === "undefined") {
              return null;
            }
            return {
              param_name: paramName.trim(),
              example: paramValue.trim()
            };
          }).filter(Boolean)
        };
      } else {
        bodyComponent.example = {
          body_text: [bodyExampleValues]
        };
      }
    }

    components.push(bodyComponent);

    // Add footer component if provided
    if (footer_text) {
      components.push({
        type: "FOOTER",
        text: footer_text
      });
    }

    // Add buttons if provided
    if (button_type && Array.isArray(buttons) && buttons.length > 0) {
      const buttonComponent: any = { type: "BUTTONS", buttons: [] };

      if (button_type === "QUICK_REPLY") {
        buttons.forEach((btn: any) => {
          if ((btn?.type || "").toUpperCase() === "QUICK_REPLY" && btn?.text) {
            buttonComponent.buttons.push({
              type: "QUICK_REPLY",
              text: btn.text
            });
          }
        });
      } else if (button_type === "CALL_TO_ACTION") {
        buttons.forEach((btn: any) => {
          const normalizedType = (btn?.type || "").toUpperCase();
          if (normalizedType === "PHONE_NUMBER" && btn?.text && btn?.phone_number) {
            buttonComponent.buttons.push({
              type: "PHONE_NUMBER",
              text: btn.text,
              phone_number: btn.phone_number
            });
          }
          if (normalizedType === "URL" && btn?.text && btn?.url) {
            buttonComponent.buttons.push({
              type: "URL",
              text: btn.text,
              url: btn.url
            });
          }
        });
      } else if (button_type === "FLOW") {
        buttons.forEach((btn: any) => {
          const normalizedType = (btn?.type || "").toUpperCase();
          if (normalizedType === "FLOW" && btn?.text && btn?.flow_id) {
            buttonComponent.buttons.push({
              type: "FLOW",
              text: btn.text,
              flow_id: btn.flow_id,
              navigate_screen: btn.navigate_screen || "SCREEN_0"
            });
          }
        });
      }

      if (buttonComponent.buttons.length > 0) {
        components.push(buttonComponent);
      }
    }

    // Submit template to Meta
    const metaUrl = new URL(`https://graph.facebook.com/v19.0/${integration.waba_id}/message_templates`);
    metaUrl.searchParams.set("access_token", integration.business_token);

    const metaPayload: Record<string, any> = {
      messaging_product: "whatsapp",
      name: template_name,
      language,
      category: category.toUpperCase(),
      allow_category_change: true,
      components
    };

    if (normalizedParameterFormat) {
      metaPayload.parameter_format = normalizedParameterFormat;
    }

    const metaResponse = await fetch(metaUrl.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${integration.business_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metaPayload)
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      // Store as draft with error
      await supabase.from("whatsapp_templates").insert({
        user_id: user.id,
        ai_id,
        template_name,
        category: category.toUpperCase(),
        language,
        header_type,
        header_text,
        header_media_url,
        header_media_handle: headerMediaMeta?.handle || null,
        header_media_media_id: headerMediaAttachmentId,
        body_text,
        footer_text,
        body_examples: bodyExampleValues,
        parameter_format: normalizedParameterFormat,
        button_type,
        buttons,
        status: "DRAFT",
        rejection_reason: metaData?.error?.message || "Failed to submit to Meta",
        meta_status: metaData?.error?.type
      });

      return NextResponse.json(
        {
          success: false,
          error: metaData?.error?.message || "Failed to create template on Meta",
          meta_error: metaData?.error
        },
        { status: metaResponse.status }
      );
    }

    // Store template in DB with PENDING status
    const submissionTimestamp = new Date().toISOString();

    const templateRecord = {
      user_id: user.id,
      ai_id,
      template_name,
      template_id: metaData.id,
      category: category.toUpperCase(),
      language,
      header_type,
      header_text,
      header_media_url,
      body_text,
      footer_text,
      body_examples: bodyExampleValues,
      parameter_format: normalizedParameterFormat,
      button_type,
      buttons,
      header_media_handle: headerMediaMeta?.handle || null,
      header_media_media_id: headerMediaAttachmentId,
      header_media_file_name: headerMediaMeta?.fileName || null,
      header_media_content_type: headerMediaMeta?.contentType || null,
      status: "PENDING",
      meta_status: metaData.status || "PENDING",
      rejection_reason: null,
      submitted_at: submissionTimestamp
    };

    console.log(`[Templates Create] Saving to DB: header_media_url=${templateRecord.header_media_url ? templateRecord.header_media_url.substring(0, 80) + '...' : 'NULL/EMPTY'}, header_media_handle=${templateRecord.header_media_handle || 'NULL'}, header_media_media_id=${templateRecord.header_media_media_id || 'NULL'}`);

    const { data: upsertData, error: dbError } = await supabase
      .from("whatsapp_templates")
      .upsert(templateRecord, { onConflict: "user_id,ai_id,template_name" })
      .select();

    console.log(`[Templates Create] DB upsert result: error=${dbError ? JSON.stringify(dbError) : 'none'}, data_count=${Array.isArray(upsertData) ? upsertData.length : 0}, saved_header_media_url=${upsertData?.[0]?.header_media_url ? 'YES' : 'NO'}`);

    if (dbError) {
      console.error("[Templates] DB upsert error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Template created on Meta but failed to save locally",
          details: dbError.message || dbError.code || dbError
        },
        { status: 500 }
      );
    }

    let template = Array.isArray(upsertData) ? upsertData[0] : null;

    if (!template) {
      const { data: fetchedTemplate } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("user_id", user.id)
        .eq("ai_id", ai_id)
        .eq("template_name", template_name)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      template = fetchedTemplate ?? null;
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template saved but could not be retrieved" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template_id: template.id,
      meta_template_id: metaData.id,
      status: "PENDING",
      message: "Template submitted for approval. Review typically takes up to 24 hours."
    });

  } catch (error: any) {
    console.error("[Templates] Create error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
