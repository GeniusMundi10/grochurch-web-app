import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/whatsapp/campaigns/list?ai_id=...
 * Fetches all campaigns for a given AI
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const ai_id = url.searchParams.get("ai_id");

    let query = supabase
      .from("whatsapp_campaigns")
      .select(`
        *,
        whatsapp_templates (
          template_name,
          status,
          body_text,
          header_type,
          header_text,
          header_media_url,
          footer_text,
          button_type,
          buttons
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ai_id) {
      // Validate ai_id belongs to user
      const { data: validate } = await supabase
        .from("business_info")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", ai_id)
        .maybeSingle();

      if (!validate?.id) {
        return NextResponse.json(
          { success: false, error: "Invalid ai_id for user" },
          { status: 403 }
        );
      }

      query = query.eq("ai_id", ai_id);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error("[Campaigns] List error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    // Auto-correct campaigns wrongly marked as COMPLETED that still have PENDING messages
    const completedCampaigns = (campaigns || []).filter((c: any) => c.status === "COMPLETED");
    for (const c of completedCampaigns) {
      try {
        const { count: pendingCount } = await supabase
          .from("campaign_messages")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id)
          .eq("status", "PENDING");

        if ((pendingCount || 0) > 0) {
          console.log(`[Campaigns] Auto-correcting campaign ${c.id}: COMPLETED → SCHEDULED (${pendingCount} pending messages)`);
          await supabase
            .from("whatsapp_campaigns")
            .update({ status: "SCHEDULED", completed_at: null })
            .eq("id", c.id);
          c.status = "SCHEDULED";
          c.completed_at = null;
        }
      } catch (e) {
        console.error(`[Campaigns] Auto-correct check failed for ${c.id}:`, e);
      }
    }

    // Format response
    const formatted = (campaigns || []).map((c: any) => {
      const template = Array.isArray(c.whatsapp_templates)
        ? c.whatsapp_templates[0]
        : c.whatsapp_templates;

      return {
        id: c.id,
        campaign_name: c.campaign_name,
        template_name: template?.template_name || "Unknown",
        template_status: template?.status,
        template_body: template?.body_text,
        template_header_type: template?.header_type,
        template_header_text: template?.header_text,
        template_header_media_url: template?.header_media_url,
        template_footer_text: template?.footer_text,
        template_button_type: template?.button_type,
        template_buttons: template?.buttons,
        status: c.status,
        total_recipients: c.total_recipients,
        sent_count: c.sent_count,
        delivered_count: c.delivered_count,
        read_count: c.read_count,
        replied_count: c.replied_count,
        failed_count: c.failed_count,
        scheduled_at: c.scheduled_at,
        started_at: c.started_at,
        completed_at: c.completed_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
        followup_config: c.followup_config
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: formatted,
      total: formatted.length
    });

  } catch (error: any) {
    console.error("[Campaigns] List error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
