import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook (no user auth context)
const getSupabaseService = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "grochurch_webhook_verify";

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Webhook] Verification successful");
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Receives inbound WhatsApp messages from Meta
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends webhook events in this structure
    const entries = body?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        const supabase = getSupabaseService();

        // Find which user owns this phone_number_id
        const { data: integration } = await supabase
          .from("whatsapp_integrations")
          .select("user_id, phone_number_id")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();

        if (!integration) {
          console.warn(`[Webhook] No integration found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        const userId = integration.user_id;

        // Process incoming messages
        const incomingMessages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const msg of incomingMessages) {
          const fromPhone = msg.from; // sender's phone number
          const contactInfo = contacts.find((c: any) => c.wa_id === fromPhone);
          const contactName = contactInfo?.profile?.name || null;

          // Extract message content
          let content = "";
          let messageType = "text";

          if (msg.type === "text") {
            content = msg.text?.body || "";
            messageType = "text";
          } else if (msg.type === "image") {
            content = msg.image?.caption || "[Image]";
            messageType = "image";
          } else if (msg.type === "video") {
            content = msg.video?.caption || "[Video]";
            messageType = "video";
          } else if (msg.type === "document") {
            content = msg.document?.filename || "[Document]";
            messageType = "document";
          } else {
            content = `[${msg.type || "Unknown"}]`;
          }

          // Upsert conversation
          const { data: conversation, error: convError } = await supabase
            .from("wa_conversations")
            .upsert(
              {
                user_id: userId,
                contact_phone: fromPhone,
                contact_name: contactName || fromPhone,
                last_message_at: new Date().toISOString(),
                last_message_preview: content.substring(0, 100),
              },
              { onConflict: "user_id,contact_phone" }
            )
            .select("id, unread_count")
            .single();

          if (convError || !conversation) {
            console.error("[Webhook] Conversation upsert error:", convError);
            continue;
          }

          // Insert message
          await supabase.from("wa_messages").insert({
            conversation_id: conversation.id,
            direction: "inbound",
            content,
            message_type: messageType,
            meta_message_id: msg.id,
            status: "delivered",
            metadata: {
              from: fromPhone,
              timestamp: msg.timestamp,
              raw_type: msg.type,
            },
          });

          // Increment unread count
          await supabase
            .from("wa_conversations")
            .update({ unread_count: (conversation.unread_count || 0) + 1 })
            .eq("id", conversation.id);

          console.log(`[Webhook] Inbound message from ${fromPhone} saved to conversation ${conversation.id}`);
        }

        // Process status updates (delivered, read)
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          if (status.id) {
            const newStatus = status.status === "delivered" ? "delivered" : status.status === "read" ? "read" : null;
            if (newStatus) {
              await supabase
                .from("wa_messages")
                .update({ status: newStatus })
                .eq("meta_message_id", status.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}
