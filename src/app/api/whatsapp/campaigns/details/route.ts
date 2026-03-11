import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const campaign_id = url.searchParams.get("id");

    if (!campaign_id) {
        return NextResponse.json({ success: false, error: "Missing campaign_id" }, { status: 400 });
    }

    try {
        // 1. Fetch campaign followup config
        const { data: campaign, error: campaignError } = await supabase
            .from("whatsapp_campaigns")
            .select("followup_config")
            .eq("id", campaign_id)
            .eq("user_id", user.id)
            .single();

        if (campaignError || !campaign) {
            return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
        }

        const config = campaign.followup_config;
        if (!config || !Array.isArray(config) || config.length === 0) {
            return NextResponse.json({ success: true, steps: [] });
        }

        // 2. Fetch templates
        const templateIds = config.map((step: any) => step.template_id).filter(Boolean);
        const { data: templates } = await supabase
            .from("whatsapp_templates")
            .select("id, template_name, body_text, header_type, header_text, header_media_url, footer_text, button_type, buttons")
            .in("id", templateIds);

        const templateMap = new Map((templates || []).map((t: any) => [t.id, t]));

        // 3. Fetch stats (aggregated from current step + message_history)
        // We now include message_history to get accurate per-step statistics
        const { data: messages } = await supabase
            .from("campaign_messages")
            .select("followup_step, status, message_history")
            .eq("campaign_id", campaign_id);

        const statsMap = new Map<number, { sent: number, delivered: number, read: number, failed: number, replied: number }>();

        // Helper to increment stats for a step
        const countStatus = (step: number, status: string) => {
            if (!statsMap.has(step)) {
                statsMap.set(step, { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 });
            }
            const s = statsMap.get(step)!;
            const st = (status || "").toLowerCase();

            if (['sent', 'delivered', 'read', 'replied'].includes(st)) s.sent++;
            if (['delivered', 'read', 'replied'].includes(st)) s.delivered++;
            if (['read', 'replied'].includes(st)) s.read++;
            if (st === 'replied') s.replied++;
            if (st === 'failed') s.failed++;
        };

        (messages || []).forEach((msg: any) => {
            // Count current step's status
            const currentStep = msg.followup_step ?? 0;
            countStatus(currentStep, msg.status);

            // Count historical steps from message_history
            const history = msg.message_history;
            if (Array.isArray(history)) {
                history.forEach((h: any) => {
                    if (typeof h.step === 'number' && h.status) {
                        countStatus(h.step, h.status);
                    }
                });
            }
        });

        // 4. Merge results
        const steps = config.map((step: any, index: number) => {
            const stepNum = index + 1;
            const t = templateMap.get(step.template_id);
            const s = statsMap.get(stepNum) || { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 };

            return {
                step_number: stepNum,
                delay_hours: step.delay_hours,
                template: t || null,
                stats: s
            };
        });

        return NextResponse.json({ success: true, steps });

    } catch (e: any) {
        console.error("[Campaign Details] Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
