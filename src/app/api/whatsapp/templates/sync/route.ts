import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/whatsapp/templates/sync
 * Synchronises Meta template statuses with our Supabase whatsapp_templates table.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ai_id = body?.ai_id;

    if (!ai_id) {
      return NextResponse.json({ success: false, error: "Missing ai_id" }, { status: 400 });
    }

    // Confirm AI belongs to user
    const { data: biz } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", ai_id)
      .maybeSingle();

    if (!biz?.id) {
      return NextResponse.json({ success: false, error: "Invalid ai_id for user" }, { status: 403 });
    }

    // Fetch existing templates for quick lookup
    const { data: dbTemplates, error: dbError } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id);

    if (dbError) {
      console.error("[Templates Sync] Failed to read DB templates", dbError);
      return NextResponse.json({ success: false, error: "Unable to read existing templates" }, { status: 500 });
    }

    const dbMap = new Map<string, any>((dbTemplates || []).map((tpl: any) => [tpl.template_id, tpl]));
    // Secondary lookup by template_name to catch records where template_id doesn't match
    const dbNameMap = new Map<string, any>((dbTemplates || []).map((tpl: any) => [tpl.template_name, tpl]));

    // Integration credentials
    const { data: integration } = await supabase
      .from("whatsapp_integrations")
      .select("waba_id, business_token")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .maybeSingle();

    if (!integration?.waba_id || !integration?.business_token) {
      return NextResponse.json({ success: false, error: "WhatsApp integration not configured" }, { status: 404 });
    }

    // Fetch Meta templates
    const graphUrl = `https://graph.facebook.com/v19.0/${integration.waba_id}/message_templates?limit=200`;
    const metaResp = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${integration.business_token}` }
    });

    if (!metaResp.ok) {
      const metaErr = await metaResp.json().catch(() => ({}));
      console.error("[Templates Sync] Meta fetch failed", metaErr);
      return NextResponse.json({
        success: false,
        error: metaErr?.error?.message || "Failed to fetch templates from Meta",
        meta_error: metaErr
      }, { status: metaResp.status });
    }

    const metaData = await metaResp.json();
    const metaTemplates: any[] = Array.isArray(metaData?.data) ? metaData.data : [];

    if (metaTemplates.length === 0) {
      return NextResponse.json({ success: true, message: "No templates returned from Meta", synced: 0 });
    }

    const nowIso = new Date().toISOString();
    const updates: any[] = [];
    const inserts: any[] = [];

    metaTemplates.forEach(metaTpl => {
      const components = Array.isArray(metaTpl?.components) ? metaTpl.components : [];
      const header = components.find((c: any) => (c?.type || "").toUpperCase() === "HEADER");
      const body = components.find((c: any) => (c?.type || "").toUpperCase() === "BODY");
      const footer = components.find((c: any) => (c?.type || "").toUpperCase() === "FOOTER");
      const buttons = components.find((c: any) => (c?.type || "").toUpperCase() === "BUTTONS");

      const statusRaw = (metaTpl?.status || "").toString().toUpperCase();
      const normalizedStatus = statusRaw.includes("APPROVED")
        ? "APPROVED"
        : statusRaw.includes("REJECT")
          ? "REJECTED"
          : statusRaw.includes("DRAFT")
            ? "DRAFT"
            : "PENDING";

      const headerType = header?.format || header?.type || null;
      const headerText = header?.text || header?.example?.header_text?.[0] || null;
      const headerMediaHandle = header?.example?.header_handle?.[0] || null;

      const buttonPayload = Array.isArray(buttons?.buttons) ? buttons.buttons : null;

      // Look up by template_id first, then fall back to template_name
      // This prevents overwriting media fields when template_id doesn't match
      const existing = dbMap.get(metaTpl?.id) || dbNameMap.get(metaTpl?.name) || null;

      if (existing) {
        console.log(`[Templates Sync] Found existing for "${metaTpl?.name}" (id: ${metaTpl?.id}), header_media_url=${existing.header_media_url ? 'YES' : 'NULL'}`);
      } else {
        console.log(`[Templates Sync] No existing record for "${metaTpl?.name}" (id: ${metaTpl?.id}) — will INSERT with header_media_url=null`);
      }

      const record = {
        user_id: user.id,
        ai_id,
        template_name: metaTpl?.name,
        template_id: metaTpl?.id,
        category: (metaTpl?.category || "UTILITY").toString().toUpperCase(),
        language: metaTpl?.language || "en",
        header_type: headerType,
        header_text: headerText,
        header_media_url: existing?.header_media_url || null,
        header_media_handle: headerMediaHandle || existing?.header_media_handle || null,
        header_media_file_name: existing?.header_media_file_name || null,
        header_media_content_type: existing?.header_media_content_type || null,
        header_media_media_id: existing?.header_media_media_id || null,
        body_text: body?.text || "",
        footer_text: footer?.text || null,
        button_type: buttonPayload?.[0]?.type || null,
        buttons: buttonPayload,
        status: normalizedStatus,
        meta_status: metaTpl?.status,
        rejection_reason: metaTpl?.rejection_reason || null,
        submitted_at: metaTpl?.created_time || nowIso,
        approved_at: normalizedStatus === "APPROVED" ? (metaTpl?.last_updated_time || nowIso) : null,
        updated_at: nowIso
      };

      if (existing) {
        updates.push({
          ...record,
          id: existing.id,
          // Keep historical submitted_at/approved_at if already set
          submitted_at: existing.submitted_at || record.submitted_at,
          approved_at: normalizedStatus === "APPROVED" ? (metaTpl?.last_updated_time || existing.approved_at || nowIso) : existing.approved_at
        });
      } else {
        inserts.push(record);
      }
    });

    if (updates.length) {
      const { error: updateError } = await supabase.from("whatsapp_templates").upsert(updates);
      if (updateError) {
        console.error("[Templates Sync] Upsert updates failed", updateError);
        return NextResponse.json({ success: false, error: "Failed updating templates" }, { status: 500 });
      }
    }

    if (inserts.length) {
      const { error: insertError } = await supabase.from("whatsapp_templates").upsert(inserts, {
        onConflict: "user_id,ai_id,template_name"
      });
      if (insertError) {
        console.error("[Templates Sync] Upsert inserts failed", insertError);
        return NextResponse.json({ success: false, error: "Failed inserting new templates" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      synced: updates.length + inserts.length,
      updated: updates.length,
      inserted: inserts.length
    });
  } catch (error: any) {
    console.error("[Templates Sync] Unexpected error", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
