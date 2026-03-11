import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/whatsapp/campaigns/status
 * Update campaign status (PAUSED, SENDING, STOPPED)
 * Body: { campaign_id: string, action: "pause" | "resume" | "stop" }
 */
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { campaign_id, action } = body;

        if (!campaign_id || !action) {
            return NextResponse.json(
                { success: false, error: "Missing campaign_id or action" },
                { status: 400 }
            );
        }

        // Verify the campaign belongs to this user
        const { data: campaign, error: fetchError } = await supabase
            .from("whatsapp_campaigns")
            .select("id, status, user_id")
            .eq("id", campaign_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (fetchError || !campaign) {
            return NextResponse.json(
                { success: false, error: "Campaign not found" },
                { status: 404 }
            );
        }

        let newStatus: string;
        const now = new Date().toISOString();

        switch (action) {
            case "pause":
                // Can only pause SENDING or SCHEDULED campaigns
                if (!["SENDING", "SCHEDULED"].includes(campaign.status)) {
                    return NextResponse.json(
                        { success: false, error: `Cannot pause a campaign with status '${campaign.status}'` },
                        { status: 400 }
                    );
                }
                newStatus = "PAUSED";
                break;

            case "resume":
                // Can resume PAUSED or COMPLETED campaigns (COMPLETED may have been wrongly set)
                if (!["PAUSED", "COMPLETED"].includes(campaign.status)) {
                    return NextResponse.json(
                        { success: false, error: `Cannot resume a campaign with status '${campaign.status}'` },
                        { status: 400 }
                    );
                }

                // FIX: Reset any stuck SENDING messages to PENDING
                // This ensures that if the campaign crashed or timed out mid-send, we recover those messages.
                const { error: resetError } = await supabase
                    .from("campaign_messages")
                    .update({ status: "PENDING" })
                    .eq("campaign_id", campaign_id)
                    .eq("status", "SENDING");

                if (resetError) {
                    console.error("[Campaign Status] Error resetting stuck messages:", resetError);
                    // Continue anyway, as we still want to resume
                }

                // Check if there are still pending messages
                const { count: pendingCount } = await supabase
                    .from("campaign_messages")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaign_id)
                    .eq("status", "PENDING");

                if ((pendingCount || 0) === 0) {
                    return NextResponse.json(
                        { success: false, error: "No pending messages to resume" },
                        { status: 400 }
                    );
                }

                // Resume to SCHEDULED so the cron picks it up
                newStatus = "SCHEDULED";
                break;

            case "stop":
                // Can stop SENDING, SCHEDULED, or PAUSED campaigns
                if (!["SENDING", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
                    return NextResponse.json(
                        { success: false, error: `Cannot stop a campaign with status '${campaign.status}'` },
                        { status: 400 }
                    );
                }
                newStatus = "STOPPED";

                // Cancel all remaining PENDING messages
                const { error: cancelError } = await supabase
                    .from("campaign_messages")
                    .update({ status: "CANCELLED", error_message: "Campaign stopped by user", billing_status: "not_charged" })
                    .eq("campaign_id", campaign_id)
                    .eq("status", "PENDING");

                if (cancelError) {
                    console.error("[Campaign Status] Error cancelling pending messages:", cancelError);
                }

                // Sync stats after cancellation
                try {
                    await supabase.rpc("sync_campaign_stats", { p_campaign_id: campaign_id });
                } catch (e) {
                    console.error("[Campaign Status] Error syncing stats:", e);
                }
                break;

            default:
                return NextResponse.json(
                    { success: false, error: `Invalid action: ${action}. Use 'pause', 'resume', or 'stop'` },
                    { status: 400 }
                );
        }

        // Update campaign status
        const { error: updateError } = await supabase
            .from("whatsapp_campaigns")
            .update({
                status: newStatus,
                ...(newStatus === "STOPPED" ? { completed_at: now } : {}),
                updated_at: now
            })
            .eq("id", campaign_id);

        if (updateError) {
            console.error("[Campaign Status] Update error:", updateError);
            return NextResponse.json(
                { success: false, error: "Failed to update campaign status" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            campaign_id,
            previous_status: campaign.status,
            new_status: newStatus
        });

    } catch (e: any) {
        console.error("[Campaign Status] Error:", e);
        return NextResponse.json(
            { success: false, error: e?.message || "Internal error" },
            { status: 500 }
        );
    }
}
