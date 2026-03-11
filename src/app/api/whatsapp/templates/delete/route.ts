import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/whatsapp/templates/delete
 * Body: { template_id?: string, db_id?: string, name?: string, ai_id: string }
 * Deletes the template from Meta (when template_id provided) and removes it locally.
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const templateId: string | undefined = body?.template_id;
    const dbId: string | undefined = body?.db_id;
    const templateName: string | undefined = body?.name;
    const aiId: string | undefined = body?.ai_id;

    if (!aiId) {
      return NextResponse.json(
        { success: false, error: "Missing ai_id" },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("whatsapp_templates")
      .select("id, template_id, template_name, ai_id, user_id")
      .eq("ai_id", aiId)
      .eq("user_id", user.id)
      .eq(templateId ? "template_id" : "id", templateId || dbId)
      .maybeSingle();

    if (templateError) {
      console.error("[Templates Delete] Fetch error", templateError);
      return NextResponse.json(
        { success: false, error: "Failed to load template" },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    const { count: campaignUsageCount, error: campaignUsageError } = await supabase
      .from("whatsapp_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("template_id", template.id)
      .eq("user_id", user.id);

    if (campaignUsageError) {
      console.error("[Templates Delete] Failed to check campaign usage", campaignUsageError);
      return NextResponse.json(
        { success: false, error: "Unable to verify template usage in campaigns" },
        { status: 500 }
      );
    }

    const { data: integration } = await supabase
      .from("whatsapp_integrations")
      .select("waba_id, business_token")
      .eq("user_id", user.id)
      .eq("ai_id", aiId)
      .maybeSingle();

    if (!integration?.waba_id || !integration?.business_token) {
      return NextResponse.json(
        { success: false, error: "WhatsApp integration not configured" },
        { status: 404 }
      );
    }

    const nameToDelete = templateName || template.template_name;
    if (!nameToDelete) {
      return NextResponse.json(
        { success: false, error: "Template name required" },
        { status: 400 }
      );
    }

    let metaDeleted = false;

    if (template.template_id) {
      const graphUrl = new URL(
        `https://graph.facebook.com/v19.0/${integration.waba_id}/message_templates`
      );
      graphUrl.searchParams.set("name", nameToDelete);
      graphUrl.searchParams.set("hsm_id", template.template_id);

      const metaResp = await fetch(graphUrl.toString(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${integration.business_token}`
        }
      });

      if (!metaResp.ok) {
        const metaError = await metaResp.json().catch(() => ({}));
        const errorCode = metaError?.error?.code;
        const errorSubcode = metaError?.error?.error_subcode;
        const alreadyMissing = errorCode === 100 && errorSubcode === 2593002;

        if (!alreadyMissing) {
          console.error("[Templates Delete] Meta delete failed", metaError);
          return NextResponse.json(
            {
              success: false,
              error: metaError?.error?.message || "Failed to delete template on Meta",
              meta_error: metaError
            },
            { status: metaResp.status }
          );
        }

        console.warn("[Templates Delete] Template missing on Meta, continuing with local cleanup", {
          template_id: template.template_id,
          name: nameToDelete,
          meta_error: metaError
        });
      } else {
        metaDeleted = true;
      }
    }

    const templateInUse = (campaignUsageCount ?? 0) > 0;

    if (templateInUse) {
      const updatePayload: Record<string, any> = {
        status: "ARCHIVED",
        updated_at: new Date().toISOString()
      };

      const { error: archiveError } = await supabase
        .from("whatsapp_templates")
        .update(updatePayload)
        .eq("id", template.id)
        .eq("user_id", user.id);

      if (archiveError) {
        console.error("[Templates Delete] Archive update failed", archiveError);
        return NextResponse.json(
          { success: false, error: archiveError.message || "Failed to archive template" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        archived: true,
        meta_deleted: metaDeleted,
        message: "Template archived because it is referenced by existing campaigns."
      });
    }

    const { error: deleteError } = await supabase
      .from("whatsapp_templates")
      .delete()
      .eq("id", template.id)
      .eq("user_id", user.id);

    if (deleteError) {
        console.error("[Templates Delete] Supabase delete failed", deleteError);
        return NextResponse.json(
          { success: false, error: deleteError.message || "Failed to delete template locally" },
          { status: 500 }
        );
    }

    return NextResponse.json({ success: true, deleted: true, meta_deleted: metaDeleted });
  } catch (error: any) {
    console.error("[Templates Delete] Unexpected error", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
