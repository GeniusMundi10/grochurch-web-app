import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { campaign_id } = body;

        if (!campaign_id) {
            return NextResponse.json(
                { success: false, error: "Missing campaign_id" },
                { status: 400 }
            );
        }

        // Check if campaign exists and belongs to user
        const { data: campaign, error: campaignError } = await supabase
            .from("whatsapp_campaigns")
            .select("id, status, failed_count")
            .eq("id", campaign_id)
            .eq("user_id", user.id)
            .single();

        if (campaignError || !campaign) {
            return NextResponse.json(
                { success: false, error: "Campaign not found" },
                { status: 404 }
            );
        }

        // Reset failed messages to PENDING
        const { data: updatedMessages, error: updateError, count } = await supabase
            .from("campaign_messages")
            .update({
                status: "PENDING",
                error_message: null,
                billing_status: null,
                failed_at: null
            })
            .eq("campaign_id", campaign_id)
            .in("status", ["FAILED", "SENDING"])
            .select("id");

        if (updateError) {
            throw updateError;
        }

        const resetCount = updatedMessages?.length || 0;

        if (resetCount > 0) {
            // Update campaign status to SCHEDULED (not SENDING) to prevent
            // cron race — the frontend's handleResumeCampaign will set SENDING via send/route.ts
            await supabase
                .from("whatsapp_campaigns")
                .update({
                    status: "SCHEDULED",
                    completed_at: null
                })
                .eq("id", campaign_id);

            // Sync stats from campaign_messages (source of truth)
            // This recalculates sent, delivered, read, replied, failed counts accurately
            const { error: syncError } = await supabase.rpc("sync_campaign_stats", {
                p_campaign_id: campaign_id
            });

            if (syncError) {
                console.error("[Campaign Retry] Failed to sync stats:", syncError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Reset ${resetCount} failed messages to pending.`,
            reset_count: resetCount
        });

    } catch (error: any) {
        console.error("[Campaign Retry] Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
