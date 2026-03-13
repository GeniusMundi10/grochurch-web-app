import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { ai_id?: string } | null;
  let ai_id = body?.ai_id as string | undefined;

  if (!ai_id) {
    const { data: biz } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    ai_id = biz?.id as string | undefined;
  }

  if (!ai_id) {
    const { data: wi } = await supabase
      .from("whatsapp_integrations")
      .select("ai_id")
      .eq("user_id", user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ai_id = (wi?.ai_id as string | undefined) || ai_id;
  }

  try {
    let query = supabase.from('whatsapp_integrations').delete().eq('user_id', user.id);
    if (ai_id) {
       query = query.eq('ai_id', ai_id);
    }
    
    const { error } = await query;
    if (error) {
      console.error("[WA_Disconnect] Failed to disconnect:", error);
      return NextResponse.json({ success: false, error: "Disconnect failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[WA_Disconnect] Error:", e);
    return NextResponse.json({ success: false, error: e?.message || 'Backend error' }, { status: 500 });
  }
}
