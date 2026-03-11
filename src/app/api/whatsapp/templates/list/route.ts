import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/whatsapp/templates/list?ai_id=...&status=APPROVED
 * Fetches templates from Meta and enriches with local DB metadata
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ai_id = url.searchParams.get("ai_id");
  if (!ai_id) {
    return NextResponse.json({ success: false, error: "Missing ai_id" }, { status: 400 });
  }

  // Validate ai_id belongs to authenticated user
  const { data: validate } = await supabase
    .from("business_info")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", ai_id)
    .maybeSingle();
  if (!validate?.id) {
    return NextResponse.json({ success: false, error: "Invalid ai_id for user" }, { status: 400 });
  }

  try {
    // Fetch templates from local DB
    const { data: dbTemplates } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id);

    // Get WhatsApp integration credentials
    const { data: wi } = await supabase
      .from("whatsapp_integrations")
      .select("waba_id, business_token")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .maybeSingle();

    if (!wi?.waba_id || !wi?.business_token) {
      // Return DB templates only if no integration
      return NextResponse.json({
        success: true,
        templates: dbTemplates || [],
        source: "database_only"
      });
    }

    // Fetch templates from Meta Graph API
    const graphUrl = `https://graph.facebook.com/v19.0/${wi.waba_id}/message_templates?limit=200`;
    const metaResponse = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${wi.business_token}` },
    });

    if (!metaResponse.ok) {
      const metaError = await metaResponse.json().catch(() => ({}));
      console.error("[Templates] Meta API error:", metaError);
      // Fallback to DB templates
      return NextResponse.json({
        success: true,
        templates: dbTemplates || [],
        source: "database_fallback",
        meta_error: metaError?.error?.message
      });
    }

    const metaData = await metaResponse.json();
    const metaTemplates = metaData?.data || [];

    // Create lookup map for DB templates by template_id (Meta ID)
    const dbMap = new Map(
      (dbTemplates || []).map((t: any) => [t.template_id, t])
    );

    // Merge Meta templates with DB metadata
    const mergedTemplates = metaTemplates.map((metaTemplate: any) => {
      const dbTemplate = dbMap.get(metaTemplate.id);

      return {
        // Meta fields
        id: metaTemplate.id,
        name: metaTemplate.name,
        language: metaTemplate.language,
        status: metaTemplate.status,
        category: metaTemplate.category,
        components: metaTemplate.components,

        // DB enrichment (if exists)
        db_id: dbTemplate?.id,
        header_media_url: dbTemplate?.header_media_url,
        header_type: dbTemplate?.header_type,
        rejection_reason: dbTemplate?.rejection_reason,
        submitted_at: dbTemplate?.submitted_at,
        approved_at: dbTemplate?.approved_at,
        created_at: dbTemplate?.created_at || metaTemplate.created_time,
        updated_at: dbTemplate?.updated_at || metaTemplate.last_updated_time
      };
    });

    // Add DB-only templates that aren't in Meta (drafts, failed submissions)
    const metaIds = new Set(metaTemplates.map((t: any) => t.id));
    const dbOnlyTemplates = (dbTemplates || [])
      .filter((t: any) => !t.template_id || !metaIds.has(t.template_id))
      .map((t: any) => ({
        id: t.id,
        name: t.template_name,
        language: t.language,
        status: t.status,
        category: t.category,
        db_id: t.id,
        body_text: t.body_text,
        header_type: t.header_type,
        header_text: t.header_text,
        header_media_url: t.header_media_url,
        footer_text: t.footer_text,
        buttons: t.buttons,
        rejection_reason: t.rejection_reason,
        submitted_at: t.submitted_at,
        created_at: t.created_at,
        updated_at: t.updated_at,
        source: "database_only"
      }));

    const allTemplates = [...mergedTemplates, ...dbOnlyTemplates];

    // Apply status filter if provided
    const statusFilter = url.searchParams.get("status");
    const includeArchivedQuery = url.searchParams.get("include_archived") === "true";
    const normalizedStatusFilter = statusFilter?.toUpperCase() || null;

    const baseFiltered = normalizedStatusFilter
      ? allTemplates.filter((t: any) => (t.status || "").toUpperCase() === normalizedStatusFilter)
      : allTemplates;

    const includeArchived = includeArchivedQuery || normalizedStatusFilter === "ARCHIVED";

    const filtered = includeArchived
      ? baseFiltered
      : baseFiltered.filter((t: any) => (t.status || "").toUpperCase() !== "ARCHIVED");

    return NextResponse.json({
      success: true,
      templates: filtered,
      total: filtered.length,
      source: "merged"
    });

  } catch (e: any) {
    console.error("[Templates] List error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
