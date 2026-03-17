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
    if (biz?.id) {
      ai_id = biz.id as string;
    } else {
      // Auto-create a minimal business_info record so WhatsApp onboarding can proceed
      const { data: newBiz, error: createErr } = await supabase
        .from("business_info")
        .insert({ user_id: user.id, ai_name: "Church Assistant", business_name: "My Church" })
        .select("id")
        .single();
      if (createErr || !newBiz?.id) {
        console.error("[WA_ES] Failed to auto-create business_info:", createErr);
        return NextResponse.json({ success: false, error: "Failed to initialize business config" }, { status: 500 });
      }
      ai_id = newBiz.id as string;
      console.log("[WA_ES] Auto-created business_info for user", { ai_id });
    }
  }

  const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
  const FB_APP_SECRET = process.env.FB_APP_SECRET;
  const GRAPH_API_VERSION = "v25.0";
  
  if (!FB_APP_ID || !FB_APP_SECRET) {
    console.error("[WA_ES] FB_APP_ID or FB_APP_SECRET is missing");
    return NextResponse.json({ success: false, error: "System configuration error (missing app secret)" }, { status: 500 });
  }

  let businessToken: string | null = null;
  let displayPhone: string | null = null;

  try {
    // 1) Exchange code for business token
    console.log("[WA_ES] Exchanging code for business token...");
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.append('client_id', FB_APP_ID);
    tokenUrl.searchParams.append('client_secret', FB_APP_SECRET);
    tokenUrl.searchParams.append('code', body.code);
    
    // Do not pass redirect_uri per the latest Meta docs for embedded signup code exchange
    const tokenResp = await fetch(tokenUrl.toString(), { method: 'GET' });
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || !tokenData.access_token) {
      console.error("[WA_ES] Token exchange failed:", tokenData);
      return NextResponse.json({ success: false, error: tokenData?.error?.message || "Token exchange failed" }, { status: 500 });
    }
    businessToken = tokenData.access_token;
    console.log("[WA_ES] Token exchange successful");

    // 2) Optional: fetch display phone number
    if (body.phone_number_id) {
      console.log(`[WA_ES] Fetching display phone for ${body.phone_number_id}...`);
      try {
        const phoneResp = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${body.phone_number_id}?fields=display_phone_number`, {
          headers: { Authorization: `Bearer ${businessToken}` }
        });
        if (phoneResp.ok) {
          const phoneData = await phoneResp.json();
          displayPhone = phoneData?.display_phone_number || null;
        }
      } catch (err) {
        console.warn("[WA_ES] Warning: fetch display_phone failed", err);
      }

      // 3) Register phone number for Cloud API use
      console.log(`[WA_ES] Registering phone ${body.phone_number_id}...`);
      try {
        const pin = process.env.WA_TWO_STEP_PIN || '123456';
        const regResp = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${body.phone_number_id}/register`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${businessToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ messaging_product: "whatsapp", pin })
        });
        const regData = await regResp.text();
        console.log(`[WA_ES] Register resp: ${regResp.status} ${regData}`);
      } catch (err) {
        console.warn("[WA_ES] Warning: register number failed", err);
      }
    }

    // 4) Subscribe app to WABA webhooks
    if (body.waba_id) {
      console.log(`[WA_ES] Subscribing WABA ${body.waba_id} to webhooks...`);
      try {
        const subResp = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${body.waba_id}/subscribed_apps?subscribed_fields=messages,message_template_status_update`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${businessToken}` }
        });
        const subData = await subResp.text();
        console.log(`[WA_ES] Subscribed_apps resp: ${subResp.status} ${subData}`);
      } catch (err) {
        console.warn("[WA_ES] Warning: subscribe WABA failed", err);
      }
    }

    // 5) Store integration in Supabase
    console.log("[WA_ES] Saving integration to Supabase...");
    const { error: upsertError } = await supabase
      .from('whatsapp_integrations')
      .upsert({
        user_id: user.id,
        ai_id: ai_id,
        waba_id: body.waba_id || '',
        phone_number_id: body.phone_number_id || '',
        business_token: businessToken,
        display_phone: displayPhone,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, ai_id'
      });

    if (upsertError) {
      console.error("[WA_ES] Failed to save integration:", upsertError);
      return NextResponse.json({ success: false, error: "Failed to save integration" }, { status: 500 });
    }

    console.log("[WA_ES] Onboarding complete!");
    return NextResponse.json({ success: true });
    
  } catch (e: any) {
    console.error("[WA_ES] Backend error:", e);
    return NextResponse.json({ success: false, error: e?.message || 'Backend error' }, { status: 500 });
  }
}
