import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const superAdmins = ["proftribute@gmail.com", "mundigenius@gmail.com"];
        if (!user || !user.email || !superAdmins.includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { church_id, plan } = body;

        if (!church_id || !plan) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { error } = await supabase
            .from("churches")
            .update({ subscription_plan: plan })
            .eq("id", church_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Failed to update plan:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
