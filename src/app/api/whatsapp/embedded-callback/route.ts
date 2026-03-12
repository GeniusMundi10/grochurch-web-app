import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    waba_id?: string;
    phone_number_id?: string;
    code?: string;
    redirect_uri?: string;
    ai_id?: string;
  } | null;

  if (!body || !body.code) {
    return NextResponse.json({ success: false, error: "Missing code" }, { status: 400 });
  }

  try {
    console.debug('[WA_ES][API] Received code from FE', {
      code_len: body.code?.length,
      redirect_uri: body.redirect_uri,
    });
  } catch {}

  // Determine ai_id: prefer value passed from client selector, else fallback to user's first AI
  let ai_id = body.ai_id as string | undefined;
  if (ai_id) {
    const { data: validate } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", ai_id)
      .maybeSingle();
    if (!validate?.id) {
      return NextResponse.json({ success: false, error: "Invalid ai_id for user" }, { status: 400 });
    }
  } else {
    const { data: biz, error: bizErr } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (bizErr || !biz?.id) {
      return NextResponse.json({ success: false, error: "Business config not found for user" }, { status: 400 });
    }
    ai_id = biz.id as string;
  }

  const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL;

  if (!backendUrl) {
    console.error("NEXT_PUBLIC_WHATSAPP_BACKEND_URL is missing");
    return NextResponse.json({ success: false, error: "System configuration error" }, { status: 500 });
  }

  try {
    const resp = await fetch(`${backendUrl}/api/whatsapp/complete-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        ai_id,
        waba_id: body.waba_id,
        phone_number_id: body.phone_number_id,
        code: body.code,
        redirect_uri: body.redirect_uri,
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success) {
      return NextResponse.json({ success: false, error: data?.error || 'Onboarding failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Backend error' }, { status: 500 });
  }
}
