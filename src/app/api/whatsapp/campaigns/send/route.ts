// Helper type for template variables
// Last updated: Wallet Integration Added
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LeadRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  custom_attributes: Record<string, any> | null;
};

type VariableMappingEntry = {
  source: "lead_field" | "custom_attribute" | "static";
  field?: "name" | "email" | "phone";
  attribute?: string;
  value?: string;
  fallback_value?: string | null;
};

type CampaignMessageRecord = {
  id: string;
  phone_number: string;
  recipient_id: string;
  conversation_id: string | null;
};

const resolvePlaceholderValue = (config: VariableMappingEntry, lead: LeadRecord): string | null => {
  let rawValue: unknown = null;

  switch (config.source) {
    case "lead_field":
      if (config.field) {
        rawValue = lead[config.field];
      }
      break;
    case "custom_attribute":
      if (config.attribute) {
        rawValue = lead.custom_attributes?.[config.attribute] ?? null;
      }
      break;
    case "static":
      rawValue = config.value ?? null;
      break;
    default:
      rawValue = null;
  }

  if (rawValue === null || typeof rawValue === "undefined" || rawValue === "") {
    if (config.fallback_value && config.fallback_value.trim().length > 0) {
      return config.fallback_value.trim();
    }
    return null;
  }

  if (Array.isArray(rawValue)) {
    return rawValue.join(", ");
  }

  if (typeof rawValue === "object") {
    return JSON.stringify(rawValue);
  }

  return String(rawValue).trim();
};

const buildBodyParameters = (
  variableMapping: Record<string, VariableMappingEntry> | null,
  lead: LeadRecord
): { success: true; parameters: any[] } | { success: false; error: string } => {
  if (!variableMapping || Object.keys(variableMapping).length === 0) {
    return { success: true, parameters: [] };
  }

  const sortedPlaceholders = Object.keys(variableMapping)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));

  const parameters: any[] = [];

  for (const placeholder of sortedPlaceholders) {
    const config = variableMapping[placeholder];
    const value = resolvePlaceholderValue(config, lead);

    if (!value) {
      return {
        success: false,
        error: `Missing value for placeholder {{${placeholder}}}`
      };
    }

    parameters.push({
      type: "text",
      text: value
    });
  }

  return { success: true, parameters };
};

const renderTemplateBodyText = (bodyText: string | null | undefined, parameters: any[]): string => {
  if (!bodyText) return "";

  let rendered = bodyText;
  parameters.forEach((param, index) => {
    const placeholder = `{{${index + 1}}}`;
    const value = typeof param?.text === "string" ? param.text : "";
    if (!value) {
      rendered = rendered.split(placeholder).join("");
    } else {
      rendered = rendered.split(placeholder).join(value);
    }
  });

  return rendered;
};

const composeCampaignMessageContent = (
  template: any,
  bodyParameters: any[]
): string => {
  const segments: string[] = [];
  const headerType = (template?.header_type || "").toUpperCase();

  if (headerType === "TEXT" && template?.header_text) {
    segments.push(template.header_text);
  } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
    if (template?.header_text) {
      segments.push(template.header_text);
    }
  }

  const body = renderTemplateBodyText(template?.body_text || "", bodyParameters);
  if (body) {
    segments.push(body);
  }

  if (template?.footer_text) {
    segments.push(template.footer_text);
  }

  return segments.join("\n").trim();
};

/**
 * POST /api/whatsapp/campaigns/send
 * Sends WhatsApp template messages to all recipients in a campaign
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { campaign_id, limit = 50 } = body;

    if (!campaign_id) {
      return NextResponse.json(
        { success: false, error: "Missing campaign_id" },
        { status: 400 }
      );
    }

    // Fetch campaign with template details
    const { data: campaign, error: campaignError } = await supabase
      .from("whatsapp_campaigns")
      .select(`
        *,
        use_marketing_api,
        message_send_ttl_seconds,
        locked_at,
        whatsapp_templates (
          template_name,
          template_id,
          status,
          body_text,
          header_type,
          header_text,
          header_media_url,
          header_media_handle,
          header_media_file_name,
          header_media_content_type,
          header_media_media_id,
          footer_text,
          buttons
        )
      `)
      .eq("id", campaign_id)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status === "COMPLETED") {
      return NextResponse.json({ success: true, message: "Campaign already completed" });
    }

    // --- CONCURRENCY LOCK: Prevent duplicate sends from cron + frontend ---
    // If another process locked this campaign within the last 2 minutes, reject.
    const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes
    if (campaign.locked_at) {
      const lockedTime = new Date(campaign.locked_at).getTime();
      const now = Date.now();
      if (now - lockedTime < LOCK_DURATION_MS) {
        return NextResponse.json({
          success: false,
          error: "Campaign is currently being processed by another process. Please wait."
        }, { status: 409 }); // 409 Conflict
      }
    }

    const template = Array.isArray(campaign.whatsapp_templates)
      ? campaign.whatsapp_templates[0]
      : campaign.whatsapp_templates;

    if (!template || template.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Template is not approved" },
        { status: 400 }
      );
    }

    // Get WhatsApp integration credentials
    const { data: integration } = await supabase
      .from("whatsapp_integrations")
      .select("phone_number_id, business_token")
      .eq("user_id", user.id)
      .eq("ai_id", campaign.ai_id)
      .maybeSingle();

    if (!integration?.phone_number_id || !integration?.business_token) {
      return NextResponse.json(
        { success: false, error: "WhatsApp integration not found" },
        { status: 404 }
      );
    }

    // Acquire lock + update status to SENDING
    const lockTimestamp = new Date().toISOString();
    await supabase
      .from("whatsapp_campaigns")
      .update({
        status: "SENDING",
        locked_at: lockTimestamp,
        ...(campaign.status !== "SENDING" ? { started_at: lockTimestamp } : {})
      })
      .eq("id", campaign_id);

    // --- ATOMIC CLAIM MECHANISM ---
    // 1. Fetch IDs of PENDING campaign messages with LIMIT
    const { data: pendingBatch, error: fetchError } = await supabase
      .from("campaign_messages")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("status", "PENDING")
      // IMPORTANT: Only pick up messages that are either immediate (scheduled_at is null) 
      // or effectively in the past/now. Do NOT touch future scheduled messages.
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .limit(limit);

    if (fetchError) {
      // Release lock before returning
      await supabase.from("whatsapp_campaigns").update({ locked_at: null }).eq("id", campaign_id);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!pendingBatch || pendingBatch.length === 0) {
      // Release lock + mark complete
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "COMPLETED", completed_at: new Date().toISOString(), locked_at: null })
        .eq("id", campaign_id);

      return NextResponse.json({
        success: true,
        message: "No pending messages to send",
        sent_count: 0,
        remaining_count: 0
      });
    }

    const idsToClaim = pendingBatch.map(m => m.id);

    // 2. Claim these messages by updating them to 'SENDING' only if they are still 'PENDING'
    // This handles the race condition where another request might have claimed them between fetch and update
    const { data: claimedMessages, error: claimError } = await supabase
      .from("campaign_messages")
      .update({
        status: "SENDING"
      })
      .in("id", idsToClaim)
      .eq("status", "PENDING")
      .select("id, phone_number, recipient_id, conversation_id");

    if (claimError) {
      console.error("[Campaign] Claim error:", claimError);
      await supabase.from("whatsapp_campaigns").update({ locked_at: null }).eq("id", campaign_id);
      return NextResponse.json({ success: false, error: "Failed to claim messages for sending" }, { status: 500 });
    }

    const messages = claimedMessages || [];

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All messages in this batch were already claimed by another process",
        sent_count: 0,
        remaining_count: -1 // Signal to retry or just continue
      });
    }
    // --- END ATOMIC CLAIM ---

    // Check if there are MORE messages remaining after this batch
    // NOTE: 'messages' are already updated to SENDING, so querying for PENDING
    // will return exactly what is left. We should NOT subtract messages.length.
    const { count: totalPending } = await supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "PENDING");

    const remaining_count = totalPending || 0;

    const campaignMessages: CampaignMessageRecord[] = (messages as CampaignMessageRecord[]) || [];

    const rawMapping = campaign.variable_mapping;
    const campaignVariableMapping: Record<string, VariableMappingEntry> =
      rawMapping && typeof rawMapping === "object"
        ? rawMapping as Record<string, VariableMappingEntry>
        : {};

    const recipientIds = Array.from(
      new Set(
        messages
          .map((msg: any) => msg.recipient_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    let leadMap = new Map<string, LeadRecord>();

    if (recipientIds.length > 0) {
      const targetTable = campaign.target_audience_type === 'profiles' ? 'profiles' : 'leads';
      const leadBatchSize = 500;
      const allLeadRows: any[] = [];

      for (let i = 0; i < recipientIds.length; i += leadBatchSize) {
        const batch = recipientIds.slice(i, i + leadBatchSize);
        const { data: leadRows, error: leadFetchError } = await supabase
          .from(targetTable)
          .select("*")
          .in("id", batch);

        if (leadFetchError) {
          console.error(`[Campaign] Failed to load ${targetTable} batch for personalization`, leadFetchError);
        } else if (leadRows) {
          allLeadRows.push(...leadRows);
        }
      }

      leadMap = new Map(allLeadRows.map((lead: any) => [
        lead.id, 
        {
          id: lead.id,
          name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || null,
          email: lead.email || null,
          phone: lead.phone || null,
          custom_attributes: lead.custom_attributes || null
        } as LeadRecord
      ]));
      console.log(`[Campaign] Loaded ${leadMap.size} ${targetTable} for personalization`);
    }

    // Send messages (batch processing)
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    const sentMessageIds: string[] = [];

    // Enforce Marketing Messages API for all sends as per user requirement
    const useMarketingApi = true; // campaign.use_marketing_api;

    const metaUrl = useMarketingApi
      ? `https://graph.facebook.com/v23.0/${integration.phone_number_id}/marketing_messages`
      : `https://graph.facebook.com/v23.0/${integration.phone_number_id}/messages`;

    // --- MEDIA RE-UPLOAD TO META (fixes 403 Forbidden on private storage URLs) ---
    // Meta cannot download from private Supabase storage URLs.
    // Solution: Download media server-side and re-upload to Meta's Media API
    // to get a fresh media_id. This is done ONCE per campaign batch.
    let freshMediaId: string | null = null;

    const uploadMediaToMetaApi = async (
      sourceUrl: string,
      mediaType: string,
      phoneNumberId: string,
      token: string
    ): Promise<string | null> => {
      try {
        console.log(`[Campaign] Downloading media from: ${sourceUrl.substring(0, 100)}...`);
        const downloadResp = await fetch(sourceUrl);
        if (!downloadResp.ok) {
          console.error(`[Campaign] Failed to download media: ${downloadResp.status} ${downloadResp.statusText}`);
          return null;
        }

        const arrayBuffer = await downloadResp.arrayBuffer();
        const contentType = downloadResp.headers.get("content-type") ||
          (mediaType === "IMAGE" ? "image/jpeg" : mediaType === "VIDEO" ? "video/mp4" : "application/pdf");

        // Extract filename from URL
        let fileName = "media-file";
        try {
          const urlPath = new URL(sourceUrl).pathname;
          const name = urlPath.split("/").filter(Boolean).pop();
          if (name) fileName = name;
        } catch { /* ignore */ }

        const blob = new Blob([arrayBuffer], { type: contentType });
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", contentType);
        formData.append("file", blob, fileName);

        console.log(`[Campaign] Uploading media to Meta (${contentType}, ${arrayBuffer.byteLength} bytes)...`);
        const uploadResp = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/media`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        const uploadData = await uploadResp.json().catch(() => ({}));
        if (!uploadResp.ok || !uploadData?.id) {
          console.error(`[Campaign] Media upload to Meta failed:`, uploadData?.error || uploadData);
          return null;
        }

        console.log(`[Campaign] Got fresh media_id from Meta: ${uploadData.id}`);
        return String(uploadData.id);
      } catch (err: any) {
        console.error(`[Campaign] Media re-upload error:`, err?.message || err);
        return null;
      }
    };

    // Determine the media source URL for this campaign
    const getMediaSourceUrl = (): { url: string; type: string } | null => {
      if (campaign.image_url) return { url: campaign.image_url, type: "IMAGE" };
      if (!template) return null;
      const headerType = (template.header_type || "").toUpperCase();
      if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) return null;
      const url = template.header_media_url
        || (template.header_media_handle?.startsWith("http") ? template.header_media_handle : null)
        || (template.header_media_media_id?.startsWith("http") ? template.header_media_media_id : null);
      return url ? { url, type: headerType } : null;
    };

    const mediaSource = getMediaSourceUrl();
    if (mediaSource) {
      freshMediaId = await uploadMediaToMetaApi(
        mediaSource.url,
        mediaSource.type,
        integration.phone_number_id,
        integration.business_token
      );
      if (!freshMediaId) {
        console.warn(`[Campaign] Could not re-upload media. Will try sending without media header.`);
      }
    }

    const resolveHeaderComponent = () => {
      if (!template && !freshMediaId) return null;
      const headerType = (template?.header_type || (campaign.image_url ? "IMAGE" : "")).toUpperCase();
      if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) return null;

      // If we have a freshly uploaded media_id from Meta, always use it
      if (freshMediaId) {
        const paramType = headerType.toLowerCase();
        const params: any = { id: freshMediaId };
        if (headerType === "DOCUMENT") {
          params.filename = template?.header_media_file_name || "document.pdf";
        }
        return {
          type: "header",
          parameters: [{ type: paramType, [paramType]: params }]
        };
      }

      // Fallback: use existing non-URL media_id or handle
      const mediaHandle: string | null = template?.header_media_handle || null;
      const mediaId: string | null = template?.header_media_media_id || null;
      if (!mediaHandle && !mediaId) return null;

      // Only use non-URL values as id (URLs should have been handled by re-upload above)
      const validId = (mediaHandle && !mediaHandle.startsWith("http")) ? mediaHandle
        : (mediaId && !mediaId.startsWith("http")) ? mediaId
          : null;
      if (!validId) return null;

      const paramType = headerType.toLowerCase();
      const params: any = { id: validId };
      if (headerType === "DOCUMENT") {
        params.filename = template?.header_media_file_name || "document.pdf";
      }
      return {
        type: "header",
        parameters: [{ type: paramType, [paramType]: params }]
      };
    };

    const headerComponent = resolveHeaderComponent();

    let messageIndex = 0;

    for (const message of campaignMessages) {
      try {
        // Every 5 messages, check if the campaign has been paused/stopped by the user
        if (messageIndex > 0 && messageIndex % 5 === 0) {
          const { data: statusCheck } = await supabase
            .from("whatsapp_campaigns")
            .select("status")
            .eq("id", campaign.id)
            .maybeSingle();

          if (statusCheck && ["PAUSED", "STOPPED"].includes(statusCheck.status)) {
            console.log(`[Campaign] Campaign ${campaign.id} was ${statusCheck.status} by user. Stopping send loop.`);
            break;
          }
        }
        messageIndex++;

        // Format phone number (remove + if present, ensure it starts with country code)
        const toPhone = message.phone_number.replace(/\+/g, '').replace(/\s/g, '');

        const lead = leadMap.get(message.recipient_id);

        if (!lead) {
          await supabase
            .from("campaign_messages")
            .update({
              status: "FAILED",
              error_message: "Lead record not found",
              billing_status: "not_charged"
            })
            .eq("id", message.id);

          failedCount++;
          continue;
        }

        const personalization = buildBodyParameters(campaignVariableMapping, lead);

        if (!personalization.success) {
          await supabase
            .from("campaign_messages")
            .update({
              status: "FAILED",
              error_message: personalization.error,
              billing_status: "not_charged"
            })
            .eq("id", message.id);

          failedCount++;
          continue;
        }

        // Build template message payload
        const payload: Record<string, any> = {
          messaging_product: "whatsapp",
          to: toPhone,
          type: "template",
          template: {
            name: template.template_name,
            language: {
              code: template.language || "en"  // Use template's language, fallback to "en"
            }
          }
        };

        // Add marketing specific fields
        if (useMarketingApi) {
          // Use campaign specific TTL or default to 24h
          const ttl = campaign.message_send_ttl_seconds || 86400;
          payload.message_send_ttl_seconds = ttl;
        }

        const templateComponents: any[] = [];

        if (headerComponent) {
          templateComponents.push(headerComponent);
        }

        if (personalization.parameters.length > 0) {
          templateComponents.push({
            type: "body",
            parameters: personalization.parameters
          });
        }

        // Add button components if template has buttons
        if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
          const buttonParameters: any[] = [];

          template.buttons.forEach((button: any, index: number) => {
            if (button.type === "FLOW") {
              // Extract flow_id from the button parameters if available
              // Note: The template structure from Meta/DB should have the flow_id
              const flowId = button.flow_id || "unknown";

              buttonParameters.push({
                type: "button",
                sub_type: "flow",
                index: index.toString(),
                parameters: [
                  {
                    type: "action",
                    action: {
                      // Embed flow_id in the token so backend knows which flow to load
                      flow_token: `flow_${flowId}_campaign_${campaign_id}_msg_${message.id}`,
                      flow_action: "data_exchange",  // Enable dynamic data exchange
                      flow_action_data: {
                        flow_id: flowId,
                        campaign_id: campaign_id,
                        message_id: message.id,
                        recipient_id: message.recipient_id
                      }
                    }
                  }
                ]
              });
            }
          });

          if (buttonParameters.length > 0) {
            templateComponents.push(...buttonParameters);
          }
        }

        if (templateComponents.length > 0) {
          payload.template.components = templateComponents;
        }

        console.log("[Campaign] Sending message payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(metaUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${integration.business_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.messages?.[0]?.id) {
          // Message sent successfully
          await supabase
            .from("campaign_messages")
            .update({
              status: "SENT",
              message_id: result.messages[0].id,
              sent_at: new Date().toISOString(),
              billing_status: "charged" // Mark as billed immediately
            })
            .eq("id", message.id);

          console.log(`[Campaign] SUCCESS: Message sent to ${toPhone}. Meta ID: ${result.messages[0].id}`);
          sentCount++;

          // Create or update conversation record
          let conversationId: string | null = message.conversation_id || null;

          if (!conversationId) {
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("ai_id", campaign.ai_id)
              .eq("end_user_id", message.recipient_id)
              .maybeSingle();

            conversationId = existingConv?.id || null;
          }

          if (!conversationId) {
            const timestamp = new Date().toISOString();
            const { data: newConv, error: conversationInsertError } = await supabase
              .from("conversations")
              .insert({
                ai_id: campaign.ai_id,
                client_id: user.id,
                end_user_id: message.recipient_id,
                started_at: timestamp,
                ended_at: timestamp,
                metadata: {
                  source: "whatsapp_campaign"
                },
                unread_count: 0
              })
              .select("id")
              .single();

            if (conversationInsertError) {
              console.error(
                `[Campaign] Failed to create conversation for campaign message ${message.id}:`,
                conversationInsertError
              );
            }

            conversationId = newConv?.id || null;
          }

          if (conversationId) {
            await supabase
              .from("campaign_messages")
              .update({ conversation_id: conversationId })
              .eq("id", message.id);

            const bodyParams = personalization.parameters;
            const content = composeCampaignMessageContent(template, bodyParams);

            const headerType = (template?.header_type || "").toUpperCase();
            const hasMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);

            const metadata: Record<string, any> = {
              source: "whatsapp_campaign",
              campaign_id: campaign.id,
              campaign_message_id: message.id,
              template_name: template.template_name,
              language_code: payload.template.language?.code || "en",
              personalization: bodyParams
            };

            if (hasMedia) {
              metadata.media = {
                type: headerType,
                url: template.header_media_url || null,
                media_id: template.header_media_media_id || null,
                handle: template.header_media_handle || null,
                file_name: template.header_media_file_name || null,
                content_type: template.header_media_content_type || null
              };
            }

            await supabase.from("messages").insert({
              conversation_id: conversationId,
              ai_id: campaign.ai_id,
              client_id: user.id,
              sender: "bot",
              content,
              message_type: "whatsapp",
              timestamp: new Date().toISOString(),
              metadata
            });

            await supabase
              .from("conversations")
              .update({
                ended_at: new Date().toISOString(),
                unread_count: 0
              })
              .eq("id", conversationId);
          }

        } else {
          // Message failed
          const errorMsg = result.error?.message || "Unknown error";
          const errorCode = result.error?.code;

          console.error(`[Campaign] FAILURE: Message to ${toPhone} failed:`, result.error);

          await supabase
            .from("campaign_messages")
            .update({
              status: "FAILED",
              error_message: errorMsg,
              failed_at: new Date().toISOString()
            })
            .eq("id", message.id);

          failedCount++;
          console.error(`[Campaign] FAILED: Message to ${toPhone} failed. Error: ${errorMsg}`);
        }

        // Moderate delay between messages. Meta Cloud API supports 80 msg/sec throughput.
        // Error 131049 is per-user frequency capping (~2 marketing msgs/user/day),
        // NOT velocity-based — handled by auto-reschedule in cron's handle_failure_result.
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`[Campaign] Error sending message ${message.id}:`, error);
        await supabase
          .from("campaign_messages")
          .update({
            status: "FAILED",
            error_message: error?.message || "Send error",
            failed_at: new Date().toISOString()
          })
          .eq("id", message.id);
        failedCount++;
      }
    }

    // Sync campaign statistics from campaign_messages (source of truth)
    // This recalculates sent, delivered, read, replied, failed counts accurately
    const { error: syncError } = await supabase.rpc("sync_campaign_stats", {
      p_campaign_id: campaign_id
    });

    if (syncError) {
      console.error("[Campaign] Failed to sync stats:", syncError);
    }

    // --- FRESH COMPLETION CHECK (fixes stale remaining_count bug) ---
    // Make sure we separate messages that are runnable NOW vs messages scheduled in the FUTURE
    const nowIso = new Date().toISOString();

    // Total pending (including future scheduled)
    const { count: totalPendingCount } = await supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "PENDING");

    // Pending currently ready to send
    const { count: readyPendingCount } = await supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "PENDING")
      .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`);

    const { count: freshSendingCount } = await supabase
      .from("campaign_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "SENDING");

    const readyRemaining = (readyPendingCount || 0) + (freshSendingCount || 0);
    const hasFutureMessages = (totalPendingCount || 0) > (readyPendingCount || 0);
    const isComplete = (totalPendingCount || 0) === 0 && (freshSendingCount || 0) === 0;

    // Release lock and update campaign status
    let nextStatus = undefined;
    if (isComplete) {
      nextStatus = "COMPLETED";
    } else if (hasFutureMessages && readyRemaining === 0) {
      // If immediate batch is done but we have throttled/future messages, 
      // put it in SCHEDULED state so cron_campaigns picks it up later
      nextStatus = "SCHEDULED";
    }

    await supabase
      .from("whatsapp_campaigns")
      .update({
        locked_at: null,
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus === "COMPLETED" ? { completed_at: nowIso } : {})
      })
      .eq("id", campaign_id);

    return NextResponse.json({
      success: true,
      campaign_id,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      remaining_count: readyRemaining,
      total_recipients: messages.length,
      message: isComplete
        ? `Campaign completed.`
        : `Batch sent. ${sentCount} this batch, ${readyRemaining} ready remaining.`
    });

  } catch (error: any) {
    console.error("[Campaign] Send error:", error);
    // Note: lock auto-expires in 2 minutes, so no explicit release needed in outer catch
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
