import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ items: [] });
  }

  try {
    // Fetch all WhatsApp integrations for this user
    const { data: integrations, error: wiErr } = await supabase
      .from("whatsapp_integrations")
      .select("ai_id, phone_number, phone_number_id, waba_id, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (wiErr || !integrations || integrations.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch AI names in one go
    const aiIds = integrations.map((r) => r.ai_id);
    const { data: aiRows } = await supabase
      .from("business_info")
      .select("id, ai_name")
      .in("id", aiIds);

    const nameMap = new Map<string, string | null>();
    (aiRows || []).forEach((r: any) => nameMap.set(r.id, r.ai_name || null));

    const items = integrations.map((r: any) => ({
      ai_id: r.ai_id as string,
      ai_name: nameMap.get(r.ai_id) || null,
      phone_number: r.phone_number || null,
      phone_number_id: r.phone_number_id || null,
      waba_id: r.waba_id || null,
      status: r.status || null,
      updated_at: r.updated_at || null,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || "Failed to list integrations" }, { status: 500 });
  }
}
