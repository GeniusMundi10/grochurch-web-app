import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const campaignId = req.nextUrl.searchParams.get("campaign_id");

        if (!campaignId) {
            return NextResponse.json(
                { success: false, error: "Missing campaign_id" },
                { status: 400 }
            );
        }

        // Verify ownership
        const { data: campaign } = await supabase
            .from("whatsapp_campaigns")
            .select("id")
            .eq("id", campaignId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!campaign) {
            return NextResponse.json(
                { success: false, error: "Campaign not found" },
                { status: 404 }
            );
        }

        // Fetch all failed messages with their error_message
        const { data: failedMessages, error: fetchError } = await supabase
            .from("campaign_messages")
            .select("error_message, phone_number, status")
            .eq("campaign_id", campaignId)
            .eq("status", "FAILED");

        if (fetchError) {
            throw fetchError;
        }

        // Group by error_message and count
        const errorGroups: Record<string, { count: number; sample_phones: string[]; all_phones: string[] }> = {};

        for (const msg of (failedMessages || [])) {
            const errorKey = msg.error_message || "Unknown error";

            if (!errorGroups[errorKey]) {
                errorGroups[errorKey] = { count: 0, sample_phones: [], all_phones: [] };
            }

            errorGroups[errorKey].count++;

            // Collect all phone numbers for detailed view
            if (msg.phone_number) {
                errorGroups[errorKey].all_phones.push(msg.phone_number);
            }

            // Keep up to 3 sample phone numbers for context (masked)
            if (errorGroups[errorKey].sample_phones.length < 3) {
                // Mask phone number for privacy (show last 4 digits)
                const phone = msg.phone_number || "";
                const masked = phone.length > 4
                    ? "***" + phone.slice(-4)
                    : phone;
                errorGroups[errorKey].sample_phones.push(masked);
            }
        }

        // Sort by count descending
        const sortedErrors = Object.entries(errorGroups)
            .map(([error, data]) => ({
                error_message: error,
                count: data.count,
                sample_phones: data.sample_phones,
                all_phones: data.all_phones
            }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            success: true,
            total_failed: failedMessages?.length || 0,
            error_breakdown: sortedErrors
        });

    } catch (error: any) {
        console.error("[Campaign Failures] Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
