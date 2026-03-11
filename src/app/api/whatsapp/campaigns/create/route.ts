import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/whatsapp/campaigns/create
 * Creates a new bulk WhatsApp campaign
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      ai_id,
      campaign_name,
      template_id,
      lead_ids,
      target_audience_type = "leads",
      scheduled_at,
      variable_mapping: rawVariableMapping,
      followup_config,
      use_marketing_api = true,
      ttl_hours = 24,
      smart_delivery = true,
      scheduler_config // { messages_per_day, start_date }
    } = body;


    const allowedLeadFields = new Set(["name", "email", "phone"]);

    const sanitizePlaceholderKey = (key: string) => {
      if (!key) return null;
      const cleaned = key.replace(/[{\s}]/g, "");
      return /^\d+$/.test(cleaned) ? cleaned : null;
    };

    let variableMapping: Record<string, any> | null = null;

    if (typeof rawVariableMapping !== "undefined" && rawVariableMapping !== null) {
      if (typeof rawVariableMapping !== "object" || Array.isArray(rawVariableMapping)) {
        return NextResponse.json(
          { success: false, error: "variable_mapping must be an object keyed by placeholder number" },
          { status: 400 }
        );
      }

      const sanitizedMapping: Record<string, any> = {};

      for (const [rawKey, config] of Object.entries(rawVariableMapping)) {
        const placeholderKey = sanitizePlaceholderKey(rawKey);
        if (!placeholderKey) {
          return NextResponse.json(
            { success: false, error: `Invalid placeholder key: ${rawKey}` },
            { status: 400 }
          );
        }

        if (!config || typeof config !== "object" || Array.isArray(config)) {
          return NextResponse.json(
            { success: false, error: `Invalid mapping config for placeholder ${rawKey}` },
            { status: 400 }
          );
        }

        const source = String((config as any).source || "").toLowerCase();
        const fallbackValue = typeof (config as any).fallback_value === "string" ? (config as any).fallback_value.trim() || null : null;

        if (!source || !["lead_field", "custom_attribute", "static"].includes(source)) {
          return NextResponse.json(
            { success: false, error: `Invalid source for placeholder ${rawKey}` },
            { status: 400 }
          );
        }

        if (source === "lead_field") {
          const field = String((config as any).field || "").toLowerCase();
          if (!allowedLeadFields.has(field)) {
            return NextResponse.json(
              { success: false, error: `Invalid lead field for placeholder ${rawKey}` },
              { status: 400 }
            );
          }
          sanitizedMapping[placeholderKey] = {
            source,
            field,
            fallback_value: fallbackValue
          };
        } else if (source === "custom_attribute") {
          const attribute = String((config as any).attribute || "").trim();
          if (!attribute) {
            return NextResponse.json(
              { success: false, error: `Missing attribute key for placeholder ${rawKey}` },
              { status: 400 }
            );
          }
          sanitizedMapping[placeholderKey] = {
            source,
            attribute,
            fallback_value: fallbackValue
          };
        } else {
          const value = typeof (config as any).value === "string" ? (config as any).value : null;
          if (!value) {
            return NextResponse.json(
              { success: false, error: `Static value required for placeholder ${rawKey}` },
              { status: 400 }
            );
          }
          sanitizedMapping[placeholderKey] = {
            source,
            value,
            fallback_value: fallbackValue
          };
        }
      }

      variableMapping = Object.keys(sanitizedMapping).length > 0 ? sanitizedMapping : {};
    }

    // Validate followup_config if provided
    if (followup_config !== null && followup_config !== undefined) {
      // Accept both old format (object) and new format (array)
      if (Array.isArray(followup_config)) {
        // Validate array format
        if (followup_config.length > 3) {
          return NextResponse.json(
            { success: false, error: "Maximum 3 follow-up steps allowed" },
            { status: 400 }
          );
        }

        for (let i = 0; i < followup_config.length; i++) {
          const step = followup_config[i];
          if (!step || typeof step !== 'object') {
            return NextResponse.json(
              { success: false, error: `Invalid follow-up step ${i + 1}` },
              { status: 400 }
            );
          }

          if (!step.template_id || typeof step.delay_hours !== 'number' || step.delay_hours <= 0) {
            return NextResponse.json(
              { success: false, error: `Follow-up step ${i + 1} must have a valid template_id and positive delay_hours` },
              { status: 400 }
            );
          }
        }
      } else if (typeof followup_config === 'object') {
        // Validate old single-step format (backward compatibility)
        if (followup_config.enabled && !followup_config.template_id) {
          return NextResponse.json(
            { success: false, error: "Follow-up config must have a template_id when enabled" },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: "followup_config must be an object or array" },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!ai_id || !campaign_name || !template_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: ai_id, campaign_name, template_id" },
        { status: 400 }
      );
    }

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one recipient (lead_id) is required" },
        { status: 400 }
      );
    }

    // Validate ai_id belongs to user
    const { data: bizInfo } = await supabase
      .from("business_info")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", ai_id)
      .maybeSingle();

    if (!bizInfo?.id) {
      return NextResponse.json(
        { success: false, error: "Invalid ai_id for user" },
        { status: 403 }
      );
    }

    // Validate template exists and belongs to user
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("id, template_name, status")
      .eq("id", template_id)
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .maybeSingle();

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found or does not belong to this AI" },
        { status: 404 }
      );
    }

    if (template.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: `Template must be APPROVED before sending. Current status: ${template.status}` },
        { status: 400 }
      );
    }

    // Validate leads belong to user and have phone numbers (Batched)
    const leads: any[] = [];
    const leadBatchSize = 500;
    const errors: any[] = [];

    const targetTable = target_audience_type === "profiles" ? "profiles" : "leads";
    for (let i = 0; i < lead_ids.length; i += leadBatchSize) {
      const batch = lead_ids.slice(i, i + leadBatchSize);
      let query = supabase.from(targetTable).select("*").in("id", batch).not("phone", "is", null);
      if (target_audience_type === "leads") {
        query = query.eq("user_id", user.id);
      }
      const { data, error } = await query;

      if (error) {
        console.error("Batch fetch error:", error);
        errors.push(error);
      } else if (data) {
        leads.push(...data);
      }
    }

    if (errors.length > 0 || leads.length === 0) {
      console.error("Lead fetch errors:", errors);
      return NextResponse.json(
        { success: false, error: "No valid leads found with phone numbers (or database error)" },
        { status: 404 }
      );
    }

    if (leads.length !== lead_ids.length) {
      console.warn(`[Campaign] ${lead_ids.length - leads.length} leads filtered out (missing phone or not owned)`);
    }

    // Create campaign
    // Determine status based on scheduler_config or scheduled_at
    let campaignStatus = "DRAFT";
    if (scheduler_config && scheduler_config.messages_per_day) {
      campaignStatus = "SCHEDULED"; // Will be processed by cron
    } else if (scheduled_at) {
      campaignStatus = "SCHEDULED";
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        user_id: user.id,
        ai_id,
        campaign_name,
        template_id,
        target_audience_type,
        target_leads: lead_ids,
        total_recipients: leads.length,
        status: campaignStatus,
        scheduled_at: scheduled_at || null,
        variable_mapping: variableMapping,
        followup_config: followup_config || null,
        use_marketing_api: true, // Enforced
        message_send_ttl_seconds: Math.round(ttl_hours * 3600),
        smart_delivery,
        scheduler_config: scheduler_config || null
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error("[Campaign] Create error:", campaignError);
      return NextResponse.json(
        { success: false, error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    // Create campaign_messages records for each lead
    // If scheduler_config is provided, assign sender_ai_id and scheduled_at
    interface CampaignMessage {
      campaign_id: string;
      recipient_id: string;
      phone_number: string;
      template_name: string;
      status: string;
      sender_ai_id?: string | null;
      scheduled_at?: string | null;
    }

    let campaignMessages: CampaignMessage[] = [];

    if (scheduler_config && scheduler_config.messages_per_day) {
      // Scheduled campaign - calculate scheduled_at for each message
      const messagesPerDay = scheduler_config.messages_per_day || 100;
      const startDate = scheduler_config.start_date
        ? new Date(scheduler_config.start_date)
        : new Date();

      campaignMessages = leads.map((lead, index) => {
        // Calculate scheduled_at based on daily limits
        // Which day should this message be sent?
        const dayOffset = Math.floor(index / messagesPerDay);
        const messageDate = new Date(startDate);
        messageDate.setDate(messageDate.getDate() + dayOffset);

        // Ensure we don't schedule in the past
        const now = new Date();
        if (messageDate < now) {
          messageDate.setTime(now.getTime());
        }

        return {
          campaign_id: campaign.id,
          recipient_id: lead.id,
          phone_number: lead.phone,
          template_name: template.template_name,
          status: "PENDING",
          sender_ai_id: null, // Uses campaign.ai_id
          scheduled_at: messageDate.toISOString()
        };
      });

      console.log(`[Campaign] Scheduled ${leads.length} messages over ${Math.ceil(leads.length / messagesPerDay)} days`);
    } else {
      // Immediate mode — set scheduled_at to NOW so:
      // 1. Cron can pick up remaining messages if browser closes mid-send
      // 2. Proper ordering in RPC (NULL scheduled_at sorts LAST, deprioritizing them)
      // The frontend still processes these via send/route.ts polling loop for fast delivery.
      const nowISO = new Date().toISOString();
      campaignMessages = leads.map((lead) => ({
        campaign_id: campaign.id,
        recipient_id: lead.id,
        phone_number: lead.phone,
        template_name: template.template_name,
        status: "PENDING",
        sender_ai_id: null,
        scheduled_at: nowISO
      }));
    }

    // Batch insert messages
    const messageBatchSize = 1000;
    for (let i = 0; i < campaignMessages.length; i += messageBatchSize) {
      const batch = campaignMessages.slice(i, i + messageBatchSize);
      const { error: messagesError } = await supabase
        .from("campaign_messages")
        .insert(batch);

      if (messagesError) {
        console.error("[Campaign] Messages insert error (batch):", messagesError);
        // Try to rollback campaign creation
        await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
        return NextResponse.json(
          { success: false, error: "Failed to create campaign messages" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      campaign_name: campaign.campaign_name,
      total_recipients: leads.length,
      status: campaignStatus,
      message: scheduled_at
        ? `Campaign scheduled for ${new Date(scheduled_at).toLocaleString()}`
        : "Campaign created. Use /send endpoint to start sending."
    });

  } catch (error: any) {
    console.error("[Campaign] Create error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
