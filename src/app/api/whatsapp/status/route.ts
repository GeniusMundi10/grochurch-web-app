import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false });
  }
  
  const url = new URL(req.url);
  const ai_id = url.searchParams.get("ai_id");
  
  try {
    let query = supabase
      .from("whatsapp_integrations")
      .select("id, ai_id, phone_number, phone_number_id, waba_id, status")
      .eq("user_id", user.id);
    
    // If ai_id is provided, filter by it
    if (ai_id) {
      query = query.eq("ai_id", ai_id);
    }
    
    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ connected: false });
    }

    // Get AI name if data exists
    if (data.ai_id) {
      const { data: aiData } = await supabase
        .from("business_info")
        .select("ai_name")
        .eq("id", data.ai_id)
        .maybeSingle();
      
      return NextResponse.json({ 
        connected: true, 
        info: {
          ...data,
          ai_name: aiData?.ai_name || 'AI'
        }
      });
    }

    return NextResponse.json({ connected: !!data, info: data || null });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
