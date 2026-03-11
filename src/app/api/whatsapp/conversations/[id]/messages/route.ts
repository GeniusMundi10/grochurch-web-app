import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/whatsapp/conversations/[id]/messages
 * Fetches messages for a specific conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before"); // cursor for pagination

  // Verify conversation belongs to user
  const { data: conversation } = await supabase
    .from("wa_conversations")
    .select("id, contact_phone, contact_name")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Fetch messages
  let query = supabase
    .from("wa_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark conversation as read
  await supabase
    .from("wa_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  return NextResponse.json({
    conversation,
    messages: (messages || []).reverse() // chronological order
  });
}

/**
 * POST /api/whatsapp/conversations/[id]/messages
 * Send a new WhatsApp text message
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const body = await req.json();
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Get conversation + integration
  const { data: conversation } = await supabase
    .from("wa_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get WhatsApp integration credentials
  const { data: integration } = await supabase
    .from("whatsapp_integrations")
    .select("phone_number_id, business_token")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!integration?.phone_number_id || !integration?.business_token) {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 404 });
  }

  // Send via Meta API
  const toPhone = conversation.contact_phone.replace(/\+/g, "").replace(/\s/g, "");

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/v23.0/${integration.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.business_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      return NextResponse.json(
        { error: metaData?.error?.message || "Failed to send message" },
        { status: 500 }
      );
    }

    const metaMessageId = metaData?.messages?.[0]?.id || null;
    const now = new Date().toISOString();

    // Save to wa_messages
    const { data: savedMessage, error: insertError } = await supabase
      .from("wa_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: message,
        message_type: "text",
        meta_message_id: metaMessageId,
        status: "sent",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Chat] Message save error:", insertError);
    }

    // Update conversation preview
    await supabase
      .from("wa_conversations")
      .update({
        last_message_at: now,
        last_message_preview: message.substring(0, 100),
      })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
      message: savedMessage,
      meta_message_id: metaMessageId,
    });
  } catch (error: any) {
    console.error("[Chat] Send error:", error);
    return NextResponse.json(
      { error: error?.message || "Send failed" },
      { status: 500 }
    );
  }
}
