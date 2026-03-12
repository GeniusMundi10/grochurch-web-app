import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { to_number: string; message: string; ai_id?: string } | null;
  if (!body?.to_number || !body?.message) {
    return NextResponse.json({ success: false, error: "Missing to_number or message" }, { status: 400 });
  }

  // Prefer ai_id provided by client (selected AI), else derive
  let ai_id = body?.ai_id as string | undefined;

  if (!ai_id) {
    const { data: biz } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    ai_id = biz?.id as string | undefined;
  }

  // Fallback: if user has no business_info row yet, try whatsapp_integrations mapping
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

  if (!ai_id) {
    return NextResponse.json({ success: false, error: "No AI found for user" }, { status: 400 });
  }

  const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL;

  if (!backendUrl) {
    console.error("NEXT_PUBLIC_WHATSAPP_BACKEND_URL is missing");
    return NextResponse.json({ success: false, error: "System configuration error" }, { status: 500 });
  }

  try {
    const resp = await fetch(`${backendUrl}/api/whatsapp/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_id, to_number: body.to_number, message: body.message })
    });
    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !data?.success) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error || data?.body || 'Test send failed',
          status: data?.status ?? resp.status,
          backendBody: data?.body ?? null,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Backend error' }, { status: 500 });
  }
}
