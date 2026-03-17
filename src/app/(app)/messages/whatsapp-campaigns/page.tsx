"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { FileText as FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Plus, Send, Search, CheckCircle2, Clock,
  Users, TrendingUp, MessageSquare, Eye, Trash2,
  Upload, Download, Filter, AlertCircle, Tag, Bot, FileText, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, Pause, Play, StopCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { FollowupDetailsFetcher } from "./followup-details-fetcher";
import { CampaignDailyStats } from "@/components/whatsapp/campaign-daily-stats";
import { CampaignFailureAnalysis } from "@/components/whatsapp/campaign-failure-analysis";
import { createClient } from "@/lib/supabase/client";


const supabase = createClient();

interface Campaign {
  id: string;
  campaign_name: string;
  template_name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  scheduled_at?: string | null;
  failed_count?: number; // Optional as older campaigns might not have it populated
  followup_config?: any[] | null;
  template_body?: string | null;
  template_header_type?: string | null;
  template_header_text?: string | null;
  template_header_media_url?: string | null;
  template_footer_text?: string | null;
  template_button_type?: string | null;
  template_buttons?: any[] | null;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ai_name?: string | null;
  custom_attributes?: Record<string, any> | null;
}

interface Template {
  id: string; // Meta template ID for display
  db_id: string; // Supabase UUID - THIS is what we send to backend
  name: string;
  status: string;
  category?: string;
  components?: any[] | null;
  body_text?: string | null;
  parameter_format?: string | null;
  header_media_url?: string;
}

interface VariableMappingEntry {
  source: "lead_field" | "custom_attribute" | "static";
  field?: "name" | "email" | "phone";
  attribute?: string;
  value?: string;
  fallback_value?: string;
}

interface AI {
  id: string;
  ai_name: string;
  display_phone?: string | null;
}

interface LeadTag {
  id: string;
  name: string;
  color?: string | null;
}

const leadFieldOptions: { label: string; value: "name" | "email" | "phone" }[] = [
  { label: "Lead name", value: "name" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" }
];

const extractPlaceholders = (bodyText: string | null | undefined): string[] => {
  if (!bodyText) return [];
  const matches = Array.from(bodyText.matchAll(/{{\s*(\d+)\s*}}/g)).map(match => match[1]);
  const unique = Array.from(new Set(matches));
  return unique.sort((a, b) => Number(a) - Number(b));
};

export default function WhatsAppCampaignsPage() {
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [targetAudience, setTargetAudience] = useState<"leads" | "profiles">("leads");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedAi, setSelectedAi] = useState("");
  const [sending, setSending] = useState(false);
  const [resumingCampaignIds, setResumingCampaignIds] = useState<Set<string>>(new Set());
  const [sendProgress, setSendProgress] = useState(0);
  const [hasIntegration, setHasIntegration] = useState(true);
  const [validAiIds, setValidAiIds] = useState<Set<string>>(new Set());
  const [retryingCampaignIds, setRetryingCampaignIds] = useState<Set<string>>(new Set());
  const [actioningCampaignIds, setActioningCampaignIds] = useState<Set<string>>(new Set());

  // Lead pagination state
  const [leadsPage, setLeadsPage] = useState(1);
  const LEADS_PAGE_SIZE = 50;

  // Real data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ais, setAis] = useState<AI[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [templateBodyText, setTemplateBodyText] = useState<string>("");
  const [templatePlaceholders, setTemplatePlaceholders] = useState<string[]>([]);
  const [variableMapping, setVariableMapping] = useState<Record<string, VariableMappingEntry>>({});
  const [customAttributeKeys, setCustomAttributeKeys] = useState<string[]>([]);

  // Multi-step Follow-up state
  interface FollowupStep {
    id: string;
    delay: string;
    templateId: string;
    imageUrl: string;
    uploading: boolean;
    variableMapping: Record<string, VariableMappingEntry>;
    placeholders: string[];
  }

  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [followupSteps, setFollowupSteps] = useState<FollowupStep[]>([]);

  // Marketing API Settings (Always enabled backend-side, only params here)
  // const [useMarketingApi, setUseMarketingApi] = useState(true); // Implicitly true now
  const [ttlHours, setTtlHours] = useState(24);
  const [smartDelivery, setSmartDelivery] = useState(true);

  // Scheduling state for automated campaigns
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [selectedSenderIds, setSelectedSenderIds] = useState<string[]>([]);
  const [messagesPerSenderPerDay, setMessagesPerSenderPerDay] = useState(100);
  const [startDate, setStartDate] = useState<string>("");

  const addFollowupStep = () => {
    if (followupSteps.length >= 3) return;
    setFollowupSteps([
      ...followupSteps,
      {
        id: Math.random().toString(36).substr(2, 9),
        delay: "24",
        templateId: "",
        imageUrl: "",
        uploading: false,
        variableMapping: {},
        placeholders: []
      }
    ]);
  };

  const removeFollowupStep = (id: string) => {
    setFollowupSteps(followupSteps.filter(step => step.id !== id));
  };

  const updateFollowupStep = (id: string, field: keyof FollowupStep, value: any) => {
    setFollowupSteps(followupSteps.map(step => {
      if (step.id === id) {
        const updated = { ...step, [field]: value };

        // If template changed, extract placeholders and reset mapping
        if (field === 'templateId' && value) {
          const tpl = templates.find(t => t.db_id === value);
          if (tpl) {
            const bodyText = tpl.components?.find((c: any) => c.type === 'BODY')?.text;
            const placeholders = extractPlaceholders(bodyText);
            updated.placeholders = placeholders;

            // Initialize mapping for new placeholders
            const newMapping: Record<string, VariableMappingEntry> = {};
            placeholders.forEach(placeholder => {
              if (step.variableMapping[placeholder]) {
                newMapping[placeholder] = step.variableMapping[placeholder];
              } else {
                newMapping[placeholder] = {
                  source: 'lead_field',
                  field: 'name',
                  fallback_value: ''
                };
              }
            });
            updated.variableMapping = newMapping;
          }
        }

        return updated;
      }
      return step;
    }));
  };

  const updateFollowupStepMapping = (stepId: string, placeholder: string, entry: VariableMappingEntry) => {
    setFollowupSteps(followupSteps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          variableMapping: {
            ...step.variableMapping,
            [placeholder]: entry
          }
        };
      }
      return step;
    }));
  };

  const handleFollowupImageUpload = async (stepId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    updateFollowupStep(stepId, 'uploading', true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `campaign-followups/${Date.now()}_${stepId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(fileName);

      updateFollowupStep(stepId, 'imageUrl', data.publicUrl);
      toast.success("Image uploaded");
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image");
    } finally {
      updateFollowupStep(stepId, 'uploading', false);
    }
  };

  // Tag-based recipient selection
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagMatchingLeadIds, setTagMatchingLeadIds] = useState<Set<string>>(new Set());

  const fetchAIs = async () => {
    if (!user?.id) return;
    try {
      const { data: aisData, error: aisError } = await supabase
        .from("business_info")
        .select("id, ai_name")
        .eq("user_id", user.id);

      if (aisError) throw aisError;

      const { data: intData, error: intError } = await supabase
        .from("whatsapp_integrations")
        .select("ai_id, display_phone")
        .eq("user_id", user.id);

      if (intError) throw intError;

      const validIds = new Set(intData?.map(i => i.ai_id) || []);
      setValidAiIds(validIds);

      if (aisData) {
        const list = aisData.map(ai => {
          const integration = intData?.find(int => int.ai_id === ai.id);
          return {
            ...ai,
            display_phone: integration?.display_phone || null
          };
        });
        setAis(list);
        // Auto-select first AI if available
        if (list.length > 0 && !selectedAi) {
          setSelectedAi(list[0].id);
        }
      }

      // If no AIs at all, make sure loading is false
      if (!aisData || aisData.length === 0) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching AIs:", error);
    }
  };

  const fetchTemplates = async (aiId: string) => {
    if (!aiId) return;
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/whatsapp/templates/list?ai_id=${aiId}&status=APPROVED`);
      const data = await response.json();

      if (data.success && data.templates) {
        const approvedTemplates = data.templates;
        
        // Map templates to ensure we have db_id (Supabase UUID)
        const mapped = approvedTemplates
          .filter((t: any) => t.db_id) // Only include templates saved in our DB
          .map((t: any) => ({
            id: t.id, // Meta template ID
            db_id: t.db_id, // Supabase UUID (required for campaign creation)
            name: t.name,
            status: t.status,
            category: t.category,
            components: t.components ?? null,
            body_text: t.body_text ?? null,
            parameter_format: t.parameter_format ?? null,
            header_media_url: t.header_media_url ?? null
          }));
        setTemplates(mapped);
        setUnsyncedCount(approvedTemplates.length - mapped.length);
      } else {
        setTemplates([]);
        setUnsyncedCount(0);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSyncTemplates = async () => {
    if (!selectedAi) return;
    setSyncing(true);
    try {
      const resp = await fetch("/api/whatsapp/templates/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_id: selectedAi })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.success) {
        const err = data?.error || data?.message || "Failed to sync templates";
        throw new Error(typeof err === "string" ? err : JSON.stringify(err));
      }

      toast.success(`Synced ${data.synced || 0} templates`);
      await fetchTemplates(selectedAi); // Reload templates
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error?.message || "Failed to sync templates");
    } finally {
      setSyncing(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const aiParam = selectedAi ? `?ai_id=${selectedAi}` : "";
      const response = await fetch(`/api/whatsapp/campaigns/list${aiParam}`);
      const data = await response.json();

      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    if (!user?.id) return;
    try {
      // Helper to fetch all pages
      let allLeads: any[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabase
          .from(targetAudience)
          .select("id, name, email, phone" + (targetAudience === "leads" ? ", custom_attributes" : ""))
          .not("phone", "is", null);
          
        if (targetAudience === "leads") {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allLeads = [...allLeads, ...data];
        if (data.length < pageSize) break;
        page++;
      }

      const data = allLeads;
      const error = null;

      if (!error && data) {
        const customKeys = new Set<string>();
        data.forEach((lead: any) => {
          if (lead.custom_attributes && typeof lead.custom_attributes === "object") {
            Object.keys(lead.custom_attributes).forEach((key) => {
              if (key) customKeys.add(key);
            });
          }
        });
        setCustomAttributeKeys(Array.from(customKeys).sort((a, b) => a.localeCompare(b)));
        setLeads(data);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  const fetchTags = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("lead_tags")
        .select("id, name, color")
        .eq("user_id", user.id)
        .order("name");

      if (!error && data) {
        setAllTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateBodyText("");
      setTemplatePlaceholders([]);
      setVariableMapping({});
      return;
    }

    const template = templates.find((t) => t.db_id === selectedTemplate);
    if (!template) {
      setTemplateBodyText("");
      setTemplatePlaceholders([]);
      setVariableMapping({});
      return;
    }

    let bodyText = template.body_text || "";

    if (!bodyText && Array.isArray(template.components)) {
      const bodyComponent = template.components.find((component: any) => component?.type === "BODY");
      if (bodyComponent?.text) {
        bodyText = bodyComponent.text;
      }
    }

    setTemplateBodyText(bodyText);
    const placeholders = extractPlaceholders(bodyText);
    setTemplatePlaceholders(placeholders);

    setVariableMapping((prev) => {
      const next: Record<string, VariableMappingEntry> = {};
      placeholders.forEach((placeholder) => {
        if (prev[placeholder]) {
          next[placeholder] = prev[placeholder];
        } else {
          next[placeholder] = {
            source: "lead_field",
            field: "name",
            fallback_value: ""
          };
        }
      });
      return next;
    });
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (user?.id) {
      fetchAIs();
      fetchLeads();
      fetchTags();
    }
  }, [user, targetAudience]);

  // Effect to update integration status (purely local state)
  useEffect(() => {
    if (selectedAi) {
      const hasInt = validAiIds.has(selectedAi);
      setHasIntegration(hasInt);
    }
  }, [selectedAi, validAiIds]);

  // Effect to fetch data (network calls) - Only triggers when selectedAi changes
  useEffect(() => {
    if (selectedAi) {
      // Always fetch campaigns to show history
      fetchCampaigns();

      // Only fetch templates if we think we might have an integration
      // We check validAiIds.has(selectedAi) directly here to avoid dependency on the separate hasIntegration state
      // preventing race conditions.
      const hasInt = validAiIds.has(selectedAi);
      if (hasInt) {
        fetchTemplates(selectedAi);
      } else {
        setTemplates([]);
      }
    }
  }, [selectedAi]); // Removed validAiIds from dependency to prevent double-fetching

  // Live Stats Fetcher Effect
  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const fetchStats = async () => {
      if (!selectedCampaign || !viewDialogOpen) return;

      console.log("[LiveStats] Fetching live stats for:", selectedCampaign.id);

      const { data: messages, error } = await supabase
        .from("campaign_messages")
        .select("status")
        .eq("campaign_id", selectedCampaign.id);

      if (error) {
        console.error("[LiveStats] Error:", error);
        return;
      }

      if (messages && mounted) {
        let sent = 0;
        let delivered = 0;
        let read = 0;
        let replied = 0;
        let failed = 0;

        messages.forEach(msg => {
          const s = (msg.status || "").toUpperCase();
          if (["SENT", "DELIVERED", "READ", "REPLIED"].includes(s)) sent++;
          if (["DELIVERED", "READ", "REPLIED"].includes(s)) delivered++;
          if (["READ", "REPLIED"].includes(s)) read++;
          if (["REPLIED"].includes(s)) replied++;
          if (s === "FAILED") failed++;
        });

        console.log("[LiveStats] Computed:", { sent, delivered, read, replied, failed, total: messages.length });

        // Update state if different from current to avoid loops, 
        // OR just blindly update since we spread previous state.
        // To be safe, we only update if counts differ to prevent render loops, 
        // but since `selectedCampaign` is a dependency, simple update might loop.
        // Actually, we should NOT put `selectedCampaign` in dependency if we update it.
        // But we need `selectedCampaign.id`.

        // We use functional update to merge stats without needing selectedCampaign dependency for the set call
        setSelectedCampaign(prev => {
          if (!prev || prev.id !== selectedCampaign.id) return prev;
          // Check if stats changed to avoid re-render if identical? 
          // For now, simplicity:
          return {
            ...prev,
            sent_count: sent,
            delivered_count: delivered,
            read_count: read,
            replied_count: replied,
            failed_count: failed
          };
        });
      }
    };

    if (viewDialogOpen && selectedCampaign?.id) {
      fetchStats();
      interval = setInterval(fetchStats, 5000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [viewDialogOpen, selectedCampaign?.id]); // Only re-run if dialog opens/closes or ID changes


  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery === "" ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);

    const matchesTags = selectedTags.size === 0 || tagMatchingLeadIds.has(lead.id);

    return matchesSearch && matchesTags;
  });

  const allVisibleSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.has(l.id));

  const handleSelectAll = () => {
    const newSelected = new Set(selectedLeads);
    if (allVisibleSelected) {
      // Unselect all visible leads
      filteredLeads.forEach(l => newSelected.delete(l.id));
    } else {
      // Select all visible leads
      filteredLeads.forEach(l => newSelected.add(l.id));
    }
    setSelectedLeads(newSelected);
  };

  // Auto-populate leads when tags are selected
  useEffect(() => {
    if (!user?.id) return;

    if (selectedTags.size === 0) {
      setTagMatchingLeadIds(new Set());
      setSelectedLeads(new Set());
      return;
    }

    const fetchLeadsByTags = async () => {
      try {
        let allMappings: any[] = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
          const { data, error } = await supabase
            .from("lead_tag_map")
            .select("lead_id")
            .eq("user_id", user.id)
            .in("tag_id", Array.from(selectedTags))
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            console.error("Error fetching leads by tags:", error);
            break;
          }

          if (!data || data.length === 0) break;

          allMappings = [...allMappings, ...data];
          if (data.length < pageSize) break;
          page++;
        }

        if (allMappings.length > 0) {
          const mappedIds = new Set(allMappings.map((mapping: any) => mapping.lead_id));

          // Filter to only included IDs that actually exist in our local leads list
          // This prevents discrepancies between total count and visible count
          const validSelectedIds = new Set<string>();
          leads.forEach(lead => {
            if (mappedIds.has(lead.id)) {
              validSelectedIds.add(lead.id);
            }
          });

          setTagMatchingLeadIds(mappedIds);
          setSelectedLeads(validSelectedIds);
        } else {
          setTagMatchingLeadIds(new Set());
          setSelectedLeads(new Set());
        }
      } catch (error) {
        console.error("Error fetching leads by tags:", error);
      }
    };

    fetchLeadsByTags();
  }, [selectedTags, user, leads]);

  const updateMappingEntry = (placeholder: string, entry: VariableMappingEntry) => {
    setVariableMapping((prev) => ({
      ...prev,
      [placeholder]: entry
    }));
  };

  const handleSendCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedAi) {
      toast.error("Please select an AI");
      return;
    }
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    if (selectedLeads.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    // Validate follow-up steps
    if (followupEnabled) {
      if (followupSteps.length === 0) {
        toast.error("Please add at least one follow-up step or disable follow-ups");
        return;
      }
      for (let i = 0; i < followupSteps.length; i++) {
        if (!followupSteps[i].templateId) {
          toast.error(`Please select a template for Follow-up Step ${i + 1}`);
          return;
        }
      }
    }

    if (templatePlaceholders.length > 0) {
      for (const placeholder of templatePlaceholders) {
        const config = variableMapping[placeholder];
        if (!config) {
          toast.error(`Set a value for placeholder {{${placeholder}}}`);
          return;
        }

        if (config.source === "lead_field") {
          if (!config.field) {
            toast.error(`Choose a lead field for {{${placeholder}}}`);
            return;
          }
        } else if (config.source === "custom_attribute") {
          if (!config.attribute) {
            toast.error(`Choose a custom attribute for {{${placeholder}}}`);
            return;
          }
        } else if (config.source === "static") {
          if (!config.value || !config.value.trim()) {
            toast.error(`Provide a static value for {{${placeholder}}}`);
            return;
          }
        }
      }
    }



    setSending(true);
    setSendProgress(10);

    try {
      // Step 1: Create campaign
      // Find the selected template to get its db_id
      const template = templates.find(t => t.db_id === selectedTemplate);
      if (!template) {
        throw new Error("Selected template not found");
      }

      const payloadMapping: Record<string, VariableMappingEntry> | null = templatePlaceholders.length > 0
        ? templatePlaceholders.reduce((acc, placeholder) => {
          const config = variableMapping[placeholder];
          if (!config) return acc;
          const entry: VariableMappingEntry = {
            source: config.source
          };
          if (config.source === "lead_field" && config.field) {
            entry.field = config.field;
          }
          if (config.source === "custom_attribute" && config.attribute) {
            entry.attribute = config.attribute;
          }
          if (config.source === "static" && config.value) {
            entry.value = config.value.trim();
          }
          if (config.fallback_value && config.fallback_value.trim().length > 0) {
            entry.fallback_value = config.fallback_value.trim();
          }
          acc[placeholder] = entry;
          return acc;
        }, {} as Record<string, VariableMappingEntry>)
        : null;

      // Prepare follow-up config (Multi-step)
      let followupConfig = null;
      if (followupEnabled && followupSteps.length > 0) {
        followupConfig = followupSteps.map((step, index) => {
          const tpl = templates.find(t => t.db_id === step.templateId);

          // Build variable mapping for this step
          const stepVariableMapping: Record<string, VariableMappingEntry> | null =
            step.placeholders.length > 0
              ? step.placeholders.reduce((acc, placeholder) => {
                const config = step.variableMapping[placeholder];
                if (config) {
                  const entry: VariableMappingEntry = {
                    source: config.source,
                    fallback_value: config.fallback_value
                  };
                  if (config.source === "lead_field" && config.field) {
                    entry.field = config.field;
                  }
                  if (config.source === "custom_attribute" && config.attribute) {
                    entry.attribute = config.attribute;
                  }
                  if (config.source === "static" && config.value) {
                    entry.value = config.value;
                  }
                  acc[placeholder] = entry;
                }
                return acc;
              }, {} as Record<string, VariableMappingEntry>)
              : null;

          return {
            step: index + 1,
            enabled: true,
            delay_hours: parseFloat(step.delay),
            template_id: step.templateId,
            template_name: tpl?.name,
            image_url: step.imageUrl || null,
            variable_mapping: stepVariableMapping
          };
        });
      }

      // Build scheduler_config if scheduling is enabled
      let schedulerConfig = null;
      if (schedulingEnabled) {
        schedulerConfig = {
          messages_per_day: messagesPerSenderPerDay,
          start_date: startDate || new Date().toISOString()
        };
      }

      const createResponse = await fetch("/api/whatsapp/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_id: selectedAi,
          campaign_name: campaignName,
          template_id: template.db_id, // Use Supabase UUID, not Meta ID
          target_audience_type: targetAudience,
          lead_ids: Array.from(selectedLeads),
          variable_mapping: payloadMapping,
          followup_config: followupConfig,
          use_marketing_api: true, // Always true
          ttl_hours: ttlHours,
          smart_delivery: smartDelivery,
          scheduler_config: schedulerConfig
        })
      });

      const createData = await createResponse.json();
      setSendProgress(30);

      if (!createData.success) {
        throw new Error(createData.error || "Failed to create campaign");
      }

      // Step 2: Send campaign in batches (IMMEDIATE MODE ONLY)
      // If scheduling is enabled, the backend/cron will handle it. We just exit.
      let totalSent = 0;
      let totalFailed = 0;

      if (schedulingEnabled) {
        setSendProgress(100);
        toast.success(`Campaign scheduled! Messages will be sent automatically starting ${startDate ? new Date(startDate).toLocaleString() : "soon"}.`);
      } else {
        setSendProgress(30);
        let remaining = 1;

        // Calculate total expected messages for progress bar
        const totalMessagesExpected = selectedLeads.size || 1;

        while (remaining > 0) {
          const sendResponse = await fetch("/api/whatsapp/campaigns/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaign_id: createData.campaign_id,
              limit: 20 // Send in batches of 20 (Reduced from 50 to avoid timeouts)
            })
          });

          const sendData = await sendResponse.json();

          if (!sendData.success) {
            throw new Error(sendData.error || "Failed to send campaign batch");
          }

          totalSent += (sendData.sent_count || 0);
          totalFailed += (sendData.failed_count || 0);
          remaining = sendData.remaining_count || 0;

          // Update progress (30% to 100%)
          // Maps 0..totalMessages to 30..100
          const currentProgress = 30 + Math.min(70, Math.floor(((totalSent + totalFailed) / totalMessagesExpected) * 70));
          setSendProgress(currentProgress);

          // Safety check to prevent infinite loops if backend is stuck
          if ((sendData.sent_count || 0) === 0 && (sendData.failed_count || 0) === 0 && remaining > 0) {
            console.warn("No progress made in batch, breaking loop to prevent infinite retries.");
            break;
          }

          // Small delay to prevent hammering if server is fast
          if (remaining > 0) await new Promise(r => setTimeout(r, 500));
        }

        setSendProgress(100);
        toast.success(`Campaign sent! ${totalSent} messages sent, ${totalFailed} failed.`);
      }
      setCreateDialogOpen(false);
      fetchCampaigns();

      // Reset form
      setCampaignName("");
      setTargetAudience("leads");
      setSelectedTemplate("");
      setSelectedLeads(new Set());
      setTemplateBodyText("");
      setTemplatePlaceholders([]);
      setVariableMapping({});
      setFollowupEnabled(false);
      setFollowupSteps([]);
      // setUseMarketingApi(false); // Removed
      setTtlHours(24);
      setSmartDelivery(true);
    } catch (error: any) {
      console.error("Campaign error:", error);
      toast.error(error.message || "Failed to send campaign");
    } finally {
      setSending(false);
      setSendProgress(0);
    }
  };

  const handleResumeCampaign = async (campaignId: string, campaignName: string) => {
    try {
      setResumingCampaignIds(prev => new Set(prev).add(campaignId));
      toast.info(`Resuming campaign: ${campaignName}`);

      let remaining = 1;
      let totalSent = 0;
      let totalFailed = 0;

      // Batch size reduced to 20 to prevent timeouts
      const BATCH_SIZE = 20;

      while (remaining > 0) {
        const sendResponse = await fetch("/api/whatsapp/campaigns/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign_id: campaignId,
            limit: BATCH_SIZE
          })
        });

        const sendData = await sendResponse.json();

        if (!sendData.success) {
          // If a batch fails, we should stop and alert the user, so they can try again.
          throw new Error(sendData.error || "Failed to send campaign batch");
        }

        totalSent += (sendData.sent_count || 0);
        totalFailed += (sendData.failed_count || 0);
        remaining = sendData.remaining_count || 0;

        // Update valid local state to reflect progress if we had one for resuming
        // Since this is a list item action, we might not have a global progress bar for it easily 
        // without more state, but we can show toast updates.
        if (totalSent > 0 && totalSent % 100 === 0) {
          toast.loading(`Resuming... Sent ${totalSent} messages so far...`);
        }

        // Safety check to prevent infinite loops
        if ((sendData.sent_count || 0) === 0 && (sendData.failed_count || 0) === 0 && remaining > 0) {
          console.warn("No progress made in resume batch, breaking loop.");
          break;
        }

        // Delay between batches
        if (remaining > 0) await new Promise(r => setTimeout(r, 500));
      }

      toast.success(`Campaign resumed and completed! Sent ${totalSent} more messages.`);
      fetchCampaigns();

    } catch (error: any) {
      console.error("Resume error:", error);
      toast.error(`Resume interrupted: ${error.message}`);
    } finally {
      setResumingCampaignIds(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  };

  const handleRetryFailed = async (campaignId: string, campaignName: string) => {
    try {
      setRetryingCampaignIds(prev => new Set(prev).add(campaignId));
      toast.info(`Retrying failed messages for: ${campaignName}`);

      const response = await fetch("/api/whatsapp/campaigns/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to reset messages");
      }

      toast.success(`Reset ${data.reset_count} messages. Resuming sending...`);

      // Update local state to reflect the reset immediately so UI updates
      setCampaigns(prev => prev.map(c => {
        if (c.id === campaignId) {
          return {
            ...c,
            failed_count: Math.max(0, (c.failed_count || 0) - data.reset_count),
            status: 'SENDING'
          };
        }
        return c;
      }));

      // Now trigger the standard resume flow
      await handleResumeCampaign(campaignId, campaignName);

    } catch (error: any) {
      console.error("Retry error:", error);
      toast.error(`Retry failed: ${error.message}`);
    } finally {
      setRetryingCampaignIds(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  };


  const stats = campaigns.reduce((acc, c) => ({
    total_sent: acc.total_sent + c.sent_count,
    total_delivered: acc.total_delivered + c.delivered_count,
    total_read: acc.total_read + c.read_count,
    total_replied: acc.total_replied + c.replied_count,
  }), { total_sent: 0, total_delivered: 0, total_read: 0, total_replied: 0 });

  // Helper to ensure consistent stats across List and Detail views
  const getCampaignStats = (c: Campaign) => {
    // User requested RAW counts from DB without manipulation.
    // This may result in Read > Delivered if webhooks are missed, but it reflects DB truth.
    const replied = c.replied_count || 0;
    const read = c.read_count || 0;
    const delivered = c.delivered_count || 0;

    const sent = c.sent_count || 0;
    const failed = c.failed_count || 0;
    const total = c.total_recipients || 1;

    // Pending = Sent - (Delivered + Failed).
    // const pending = Math.max(0, sent - delivered - failed);

    return { replied, read, delivered, sent, failed, total };
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
            <Send className="w-7 h-7 text-brand-orange" />
            Campaigns
          </h1>
          <p className="text-slate-500 mt-2 text-[15px]">
            Send bulk messages and track campaign performance.
          </p>
        </div>

        {/* AI Selector - Always Visible */}
        {ais.length > 0 && (
          <div className="mb-8">
            <Card className="brand-gradient text-white border-0 rounded-2xl overflow-hidden relative shadow-xl shadow-slate-200/40">
              {/* Cross watermark */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
                <svg viewBox="0 0 100 120" className="w-[200px] h-[200px]" fill="white">
                  <rect x="38" y="0" width="24" height="120" rx="4" />
                  <rect x="10" y="28" width="80" height="24" rx="4" />
                </svg>
              </div>
              <CardContent className="pt-6 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2 text-white font-bold sm:min-w-[120px]">
                    <Bot className="h-4 w-4 text-orange-400" />
                    <label>Viewing campaigns for:</label>
                  </div>
                  <Select
                    value={selectedAi || undefined}
                    onValueChange={(value) => setSelectedAi(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[300px] bg-white/10 border-white/20 text-white focus:ring-orange-500/20 focus:border-orange-500 transition-all backdrop-blur-sm">
                      <SelectValue placeholder="Select an AI" />
                    </SelectTrigger>
                    <SelectContent>
                      {ais.map((ai) => (
                        <SelectItem key={ai.id} value={ai.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{ai.ai_name || "Unnamed AI"}</span>
                            {ai.display_phone && (
                              <span className="text-[10px] text-slate-500 font-mono">{ai.display_phone}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Sent", value: stats.total_sent, icon: Send, color: "text-brand-navy", iconColor: "text-brand-navy/30" },
            { label: "Delivered", value: stats.total_delivered, icon: CheckCircle2, color: "text-orange-600", iconColor: "text-orange-400/40" },
            { label: "Read", value: stats.total_read, icon: Eye, color: "text-brand-navy", iconColor: "text-brand-navy/30" },
            { label: "Replied", value: stats.total_replied, icon: MessageSquare, color: "text-orange-600", iconColor: "text-orange-400/40" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
                      <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-orange-200/50 bg-orange-50/50 p-4 text-sm text-orange-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-orange-500" />
          <p>
            <span className="font-semibold">Reminder:</span> WhatsApp only reports message reads for recipients with read receipts enabled. Read counts may stay at zero even when recipients view your message but have receipts turned off.
          </p>
        </div>

        <div className="mb-6">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold px-6 shadow-md transition-all hover:shadow-lg active:scale-95">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50 text-slate-900 rounded-2xl border-0 shadow-2xl p-0 focus:outline-none">
              <DialogHeader className="brand-gradient text-white rounded-t-2xl px-6 pt-6 pb-4 relative overflow-hidden">
                {/* Cross watermark in header */}
                <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
                  <svg viewBox="0 0 100 120" className="w-[150px] h-[150px]" fill="white">
                    <rect x="38" y="0" width="24" height="120" rx="4" />
                    <rect x="10" y="28" width="80" height="24" rx="4" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-bold text-white relative z-10">Create Bulk Campaign</DialogTitle>
                <DialogDescription className="text-white/60 relative z-10">Select recipients and template to send bulk WhatsApp messages</DialogDescription>
              </DialogHeader>

              <div className="relative overflow-hidden">
                {/* Full background cross watermark */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 100 120" className="w-[600px] h-[600px] text-brand-navy opacity-[0.03]" fill="currentColor">
                    <rect x="38" y="0" width="24" height="120" rx="4" />
                    <rect x="10" y="28" width="80" height="24" rx="4" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="space-y-6 py-8 px-6">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaignName" className="font-semibold text-brand-navy">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    placeholder="e.g., Sunday Service Reminder"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="bg-white focus:ring-brand-orange/20 focus:border-brand-orange border-slate-300 shadow-sm"
                  />
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="targetAudience" className="font-semibold text-brand-navy">Target Audience *</Label>
                  <Select value={targetAudience} onValueChange={(val: "leads" | "profiles") => {
                    setTargetAudience(val);
                    setSelectedLeads(new Set());
                  }}>
                    <SelectTrigger id="targetAudience" className="bg-white border-slate-300 shadow-sm">
                      <SelectValue placeholder="Select Audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl z-[100]">
                      <SelectItem value="leads">Outreach Prospects (Leads)</SelectItem>
                      <SelectItem value="profiles">Church Members (Profiles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Selection */}
                <div className="space-y-2">
                  <Label htmlFor="ai" className="font-semibold text-brand-navy">Select WhatsApp Number *</Label>
                  <Select value={selectedAi} onValueChange={(val) => {
                    setSelectedAi(val);
                    setSelectedTemplate(""); // Reset template when AI changes
                  }}>
                    <SelectTrigger id="ai" className="bg-white focus:ring-brand-orange/20 focus:border-brand-orange border-slate-300 shadow-sm">
                      <SelectValue placeholder="Choose a WhatsApp number" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl z-[100]">
                      {ais.map(ai => (
                        <SelectItem key={ai.id} value={ai.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{ai.ai_name || "Unnamed AI"}</span>
                            {ai.display_phone && (
                              <span className="text-[10px] text-slate-500 font-mono italic">{ai.display_phone}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                  {hasIntegration && selectedAi && (
                    <div className="mt-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800 border border-blue-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Associated Phone: <span className="font-bold font-mono text-sm">{ais.find(ai => ai.id === selectedAi)?.display_phone || "Not available"}</span></span>
                    </div>
                  )}

                  {!hasIntegration && selectedAi && (
                    <div className="mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 border border-yellow-200">
                      This AI does not have a connected WhatsApp number. Campaigns will not be sent.
                    </div>
                  )}

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template" className="font-semibold text-brand-navy">Select Template *</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                    disabled={!selectedAi || loadingTemplates || !hasIntegration}
                  >
                    <SelectTrigger id="template" className="bg-white focus:ring-brand-orange/20 focus:border-brand-orange border-slate-300 shadow-sm">
                      <SelectValue placeholder={
                        !selectedAi ? "Select a WhatsApp number first" :
                          loadingTemplates ? "Loading templates..." :
                            templates.length === 0 ? "No approved templates" :
                              "Choose an approved template"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-xl z-[100]">
                      {templates.map(t => (
                        <SelectItem key={t.db_id} value={t.db_id}>
                          {t.name} {t.category && `(${t.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {unsyncedCount > 0 && (
                    <div className="mt-2 rounded-md bg-blue-50 p-3 text-sm border border-blue-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-900 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Unsynced Templates Found
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          You have {unsyncedCount} approved template{unsyncedCount !== 1 ? 's' : ''} in Meta that need to be synced before you can use them here.
                        </p>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleSyncTemplates();
                        }} 
                        disabled={syncing}
                        size="sm" 
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm ml-4"
                      >
                        {syncing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : 'Sync Now'}
                      </Button>
                    </div>
                  )}
                </div>

                {selectedTemplate && (() => {
                  const tpl = templates.find(t => t.db_id === selectedTemplate);
                  if (!tpl) return null;
                  const comps = Array.isArray(tpl.components) ? tpl.components : [];
                  const headerComp = comps.find((c: any) => (c?.type || '').toUpperCase() === 'HEADER');
                  const bodyComp = comps.find((c: any) => (c?.type || '').toUpperCase() === 'BODY');
                  const footerComp = comps.find((c: any) => (c?.type || '').toUpperCase() === 'FOOTER');
                  const buttonsComp = comps.find((c: any) => (c?.type || '').toUpperCase() === 'BUTTONS');
                  const headerFormat = (headerComp?.format || '').toUpperCase();
                  const bodyText = bodyComp?.text || templateBodyText || '';
                  const footerText = footerComp?.text || '';
                  const buttons = buttonsComp?.buttons || [];

                  if (!bodyText && !headerComp) return null;

                  return (
                    <div className="space-y-2">
                      <Label className="font-semibold text-brand-navy">Template Preview</Label>
                      <div className="rounded-xl border bg-slate-100/50 p-4">
                        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden max-w-sm mx-auto">
                          {/* Header */}
                          {headerComp && (
                            <>
                              {headerFormat === 'TEXT' && headerComp.text && (
                                <div className="px-4 pt-3 pb-1 font-semibold text-slate-900 text-sm">
                                  {headerComp.text}
                                </div>
                              )}
                              {headerFormat === 'VIDEO' && (
                                <div className="relative h-40 w-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-2">
                                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                  <span className="text-white/70 text-xs font-medium tracking-wide uppercase">Video</span>
                                </div>
                              )}
                              {headerFormat === 'IMAGE' && (
                                <div className="relative h-44 w-full bg-gradient-to-br from-slate-200 to-slate-300 flex flex-col items-center justify-center gap-2 overflow-hidden">
                                  {tpl.header_media_url && tpl.header_media_url.startsWith('https') ? (
                                    <img src={tpl.header_media_url} alt="Template Header" className="w-full h-full object-cover" />
                                  ) : (
                                    <>
                                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                                      <span className="text-slate-500 text-xs font-medium tracking-wide uppercase">Image</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {headerFormat === 'DOCUMENT' && (
                                <div className="relative h-28 w-full bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center gap-2">
                                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                                  <span className="text-blue-500 text-xs font-medium tracking-wide uppercase">Document</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Body */}
                          {bodyText && (
                            <div className="px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {bodyText}
                            </div>
                          )}

                          {/* Footer */}
                          {footerText && (
                            <div className="px-4 pb-2 text-xs text-slate-400">
                              {footerText}
                            </div>
                          )}

                          {/* Buttons */}
                          {buttons.length > 0 && (
                            <div className="border-t divide-y">
                              {buttons.map((btn: any, idx: number) => (
                                <div key={idx} className="px-4 py-2.5 text-center text-blue-600 text-sm font-medium">
                                  {btn.text || btn.label || `Button ${idx + 1}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {templatePlaceholders.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">Personalization</h4>
                      <p className="text-xs text-slate-500">Map each template variable to a lead field, custom attribute, or a fixed value.</p>
                    </div>
                    <div className="space-y-3">
                      {templatePlaceholders.map((placeholder) => {
                        const mapping = variableMapping[placeholder] ?? { source: "lead_field", field: "name", fallback_value: "" };
                        return (
                          <div key={placeholder} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-brand-navy">{"Placeholder {{" + placeholder + "}}"}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source</Label>
                                <Select
                                  value={mapping.source}
                                  onValueChange={(value: "lead_field" | "custom_attribute" | "static") => {
                                    const next: VariableMappingEntry = {
                                      source: value,
                                      fallback_value: mapping.fallback_value ?? ""
                                    };
                                    if (value === "lead_field") {
                                      next.field = mapping.field ?? "name";
                                    }
                                    if (value === "custom_attribute") {
                                      next.attribute = mapping.attribute ?? customAttributeKeys[0] ?? "";
                                    }
                                    if (value === "static") {
                                      next.value = mapping.value ?? "";
                                    }
                                    updateMappingEntry(placeholder, next);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="lead_field">Lead field</SelectItem>
                                    <SelectItem value="custom_attribute" disabled={customAttributeKeys.length === 0}>
                                      Custom attribute
                                    </SelectItem>
                                    <SelectItem value="static">Static value</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-slate-500">
                                  {mapping.source === "lead_field" && "Lead field"}
                                  {mapping.source === "custom_attribute" && "Custom attribute"}
                                  {mapping.source === "static" && "Static value"}
                                </Label>
                                {mapping.source === "lead_field" && (
                                  <Select
                                    value={mapping.field ?? "name"}
                                    onValueChange={(value: "name" | "email" | "phone") => {
                                      updateMappingEntry(placeholder, {
                                        ...mapping,
                                        source: "lead_field",
                                        field: value
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {leadFieldOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {mapping.source === "custom_attribute" && (
                                  <Select
                                    value={mapping.attribute ?? (customAttributeKeys[0] ?? "")}
                                    onValueChange={(value: string) => {
                                      updateMappingEntry(placeholder, {
                                        ...mapping,
                                        source: "custom_attribute",
                                        attribute: value
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={customAttributeKeys.length === 0 ? "No custom attributes" : "Choose attribute"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {customAttributeKeys.length === 0 ? (
                                        <SelectItem value="" disabled>
                                          No custom attributes available
                                        </SelectItem>
                                      ) : (
                                        customAttributeKeys.map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {key}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                                {mapping.source === "static" && (
                                  <Input
                                    value={mapping.value ?? ""}
                                    onChange={(event) => {
                                      updateMappingEntry(placeholder, {
                                        ...mapping,
                                        source: "static",
                                        value: event.target.value
                                      });
                                    }}
                                    placeholder="Enter value"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fallback (optional)</Label>
                                <Input
                                  value={mapping.fallback_value ?? ""}
                                  onChange={(event) => {
                                    updateMappingEntry(placeholder, {
                                      ...mapping,
                                      fallback_value: event.target.value
                                    });
                                  }}
                                  placeholder="Value to use if selected data is missing"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-orange" />
                      <Label className="text-sm font-bold text-brand-navy">Filter by Tags (Optional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select tags to auto-populate recipients. You can still manually adjust selections below.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => {
                        const isSelected = selectedTags.has(tag.id);
                        return (
                          <Badge
                            key={tag.id}
                            variant={isSelected ? "default" : "outline"}
                            style={isSelected ? { backgroundColor: '#f97316', color: 'white' } : {}}
                            className={cn(
                              "cursor-pointer hover:opacity-80 transition-opacity",
                              !isSelected && "border-slate-300 text-slate-600"
                            )}
                            onClick={() => {
                              const newTags = new Set(selectedTags);
                              if (isSelected) {
                                newTags.delete(tag.id);
                              } else {
                                newTags.add(tag.id);
                              }
                              setSelectedTags(newTags);
                            }}
                          >
                            {tag.name}
                          </Badge>
                        );
                      })}
                    </div>
                    {selectedTags.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTags(new Set())}
                        className="text-xs"
                      >
                        Clear tag filters
                      </Button>
                    )}
                  </div>
                )}

                {/* Recipients */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-brand-navy">Select Recipients *</Label>
                    <Badge className="bg-brand-navy text-white">{selectedLeads.size} selected</Badge>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setLeadsPage(1); // Reset to first page on search
                      }}
                      className="pl-10 bg-white border-slate-300 shadow-sm focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="selectAll"
                      className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                      checked={allVisibleSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="selectAll" className="text-sm font-semibold text-brand-navy cursor-pointer">
                      Select All ({filteredLeads.length})
                    </Label>
                  </div>

                  <ScrollArea className="h-[300px] border border-slate-200 bg-white shadow-sm rounded-lg p-3">
                    <div className="space-y-2">
                      {filteredLeads
                        .slice((leadsPage - 1) * LEADS_PAGE_SIZE, leadsPage * LEADS_PAGE_SIZE)
                        .map((lead) => (
                          <div key={lead.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded group transition-colors">
                            <Checkbox
                              id={lead.id}
                              className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                              checked={selectedLeads.has(lead.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedLeads);
                                if (checked) {
                                  newSelected.add(lead.id);
                                } else {
                                  newSelected.delete(lead.id);
                                }
                                setSelectedLeads(newSelected);
                              }}
                            />
                            <Label htmlFor={lead.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{lead.name || "Unknown"}</p>
                                  <p className="text-xs text-gray-500">
                                    {lead.email || lead.phone}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-400">{lead.phone}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>

                  {/* Pagination Controls */}
                  {filteredLeads.length > LEADS_PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-2 text-sm">
                      <span className="text-gray-500">
                        Showing {((leadsPage - 1) * LEADS_PAGE_SIZE) + 1}-{Math.min(leadsPage * LEADS_PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                          disabled={leadsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeadsPage(p => Math.min(Math.ceil(filteredLeads.length / LEADS_PAGE_SIZE), p + 1))}
                          disabled={leadsPage >= Math.ceil(filteredLeads.length / LEADS_PAGE_SIZE)}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {sending && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Sending messages...</span>
                      <span>{sendProgress}%</span>
                    </div>
                    <Progress value={sendProgress} className="h-2" />
                  </div>
                )}
                  </div>

                  {/* Marketing API Settings (Always Visible) */}
                  <div className="space-y-4 pt-4 border-t border-slate-200 px-6">
                <div className="space-y-1">
                  <Label className="text-base font-bold text-brand-navy">Marketing Optimization</Label>
                  <p className="text-sm text-slate-500 font-medium">Enhanced settings for campaign delivery.</p>
                </div>

                <div className="space-y-6 pl-4 border-l-2 border-emerald-100 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-brand-navy">Smart Delivery</Label>
                        <p className="text-xs text-slate-500">AI-driven delivery optimization for better engagement.</p>
                      </div>
                      <Switch
                        checked={smartDelivery}
                        className="data-[state=checked]:bg-brand-orange"
                        onCheckedChange={setSmartDelivery}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-brand-navy">Message Expiry (TTL)</Label>
                        <span className="text-sm font-bold text-brand-orange font-mono">{ttlHours} hours</span>
                      </div>
                      <Slider
                        value={[ttlHours]}
                        min={12}
                        max={720}
                        step={1}
                        onValueChange={([val]) => setTtlHours(val)}
                        className="py-4"
                      />
                      <p className="text-[10px] text-slate-400">
                        Messages will not be delivered after this period if the recipient is offline. (Min 12h, Max 30 days)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

                  {/* Smart Scheduling */}
                  <div className="space-y-4 pt-4 border-t border-slate-200 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-bold text-brand-navy">Smart Scheduling</Label>
                    <p className="text-sm text-slate-500 font-medium">Spread messages across multiple days to avoid rate limits.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scheduling"
                      className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                      checked={schedulingEnabled}
                      onCheckedChange={(checked) => setSchedulingEnabled(checked as boolean)}
                    />
                    <Label htmlFor="scheduling" className="font-semibold text-brand-navy cursor-pointer">Enable Scheduling</Label>
                  </div>
                </div>

                {schedulingEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                    {/* Messages per Day */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Messages per Day</Label>
                        <Input
                          type="number"
                          min="10"
                          max="1000"
                          value={messagesPerSenderPerDay}
                          onChange={(e) => setMessagesPerSenderPerDay(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))}
                        />
                        <p className="text-xs text-slate-500">
                          Recommended: 100-200 for new accounts, up to 1000 for verified accounts.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <p className="text-xs text-slate-500">
                          Leave empty to start immediately.
                        </p>
                      </div>
                    </div>

                    {/* Estimated Completion */}
                    {selectedLeads.size > 0 && (
                      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 border border-blue-200">
                        <strong>Estimated Duration:</strong>{' '}
                        {(() => {
                          const daysNeeded = Math.ceil(selectedLeads.size / messagesPerSenderPerDay);
                          return `${daysNeeded} day${daysNeeded > 1 ? 's' : ''} to send ${selectedLeads.size} messages at ${messagesPerSenderPerDay}/day`;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

                  {/* Follow-up Sequence */}
                  <div className="space-y-4 pt-4 border-t border-slate-200 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-bold text-brand-navy">Follow-up Sequence</Label>
                    <p className="text-sm text-slate-500 font-medium">Automatically send follow-ups if no reply is received.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followup"
                      className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                      checked={followupEnabled}
                      onCheckedChange={(checked) => {
                        setFollowupEnabled(checked as boolean);
                        if (checked && followupSteps.length === 0) {
                          addFollowupStep();
                        }
                      }}
                    />
                    <Label htmlFor="followup" className="font-semibold text-brand-navy cursor-pointer">Enable Follow-ups</Label>
                  </div>
                </div>

                {followupEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                    {/* Pricing Disclaimer */}
                    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 border border-blue-200 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        <strong>Note:</strong> Messages sent more than 24 hours after the first message may incur additional charges from Meta as they open a new conversation window.
                      </p>
                    </div>

                    {followupSteps.map((step, index) => (
                      <div key={step.id} className="relative rounded-lg border bg-slate-50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-700">Step {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFollowupStep(step.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Delay (Hours)</Label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <Input
                                type="number"
                                min="1"
                                className="pl-9"
                                value={step.delay}
                                onChange={(e) => updateFollowupStep(step.id, 'delay', e.target.value)}
                              />
                            </div>
                            <p className="text-xs text-slate-500">
                              {index === 0 ? "After campaign message" : `After Step ${index}`}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Select Template</Label>
                            <Select
                              value={step.templateId}
                              onValueChange={(val) => updateFollowupStep(step.id, 'templateId', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose template" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map(t => (
                                  <SelectItem key={t.db_id} value={t.db_id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Image Upload for this step */}
                        {step.templateId && (() => {
                          const tpl = templates.find(t => t.db_id === step.templateId);
                          const hasImageHeader = tpl?.components?.some(
                            (c: any) => c.type === "HEADER" && c.format === "IMAGE"
                          );

                          if (hasImageHeader) {
                            return (
                              <div className="space-y-2">
                                <Label>Header Image (Optional Override)</Label>
                                <div className="flex items-center gap-4">
                                  {step.imageUrl ? (
                                    <div className="relative h-20 w-20 rounded-md border overflow-hidden group">
                                      <img src={step.imageUrl} alt="Follow-up header" className="h-full w-full object-cover" />
                                      <button
                                        onClick={() => updateFollowupStep(step.id, 'imageUrl', "")}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="h-4 w-4 text-white" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex-1">
                                      <Label
                                        htmlFor={`followup-image-${step.id}`}
                                        className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white hover:bg-slate-50"
                                      >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                          {step.uploading ? (
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                                          ) : (
                                            <>
                                              <Upload className="h-6 w-6 text-slate-400 mb-1" />
                                              <p className="text-xs text-slate-500">Click to upload image</p>
                                            </>
                                          )}
                                        </div>
                                        <Input
                                          id={`followup-image-${step.id}`}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => handleFollowupImageUpload(step.id, e)}
                                          disabled={step.uploading}
                                        />
                                      </Label>
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-500 max-w-[200px]">
                                    <p>Upload an image to override the template's default media.</p>
                                    <p className="mt-1">If left empty, the default template image will be used.</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Variable Mapping for this step */}
                        {step.templateId && step.placeholders.length > 0 && (
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-semibold text-slate-700">Personalization</h5>
                              <p className="text-xs text-slate-500">Map each template variable to a lead field, custom attribute, or a fixed value.</p>
                            </div>
                            <div className="space-y-3">
                              {step.placeholders.map((placeholder) => {
                                const mapping = step.variableMapping[placeholder] ?? { source: "lead_field", field: "name", fallback_value: "" };
                                return (
                                  <div key={placeholder} className="rounded-lg border p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-slate-700">{"Placeholder {{" + placeholder + "}}"}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wide text-slate-500">Source</Label>
                                        <Select
                                          value={mapping.source}
                                          onValueChange={(value: "lead_field" | "custom_attribute" | "static") => {
                                            const next: VariableMappingEntry = {
                                              source: value,
                                              fallback_value: mapping.fallback_value ?? ""
                                            };
                                            if (value === "lead_field") {
                                              next.field = mapping.field ?? "name";
                                            }
                                            if (value === "custom_attribute") {
                                              next.attribute = mapping.attribute ?? customAttributeKeys[0] ?? "";
                                            }
                                            if (value === "static") {
                                              next.value = mapping.value ?? "";
                                            }
                                            updateFollowupStepMapping(step.id, placeholder, next);
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="lead_field">Lead field</SelectItem>
                                            <SelectItem value="custom_attribute" disabled={customAttributeKeys.length === 0}>
                                              Custom attribute
                                            </SelectItem>
                                            <SelectItem value="static">Static value</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wide text-slate-500">
                                          {mapping.source === "lead_field" && "Lead field"}
                                          {mapping.source === "custom_attribute" && "Custom attribute"}
                                          {mapping.source === "static" && "Static value"}
                                        </Label>
                                        {mapping.source === "lead_field" && (
                                          <Select
                                            value={mapping.field ?? "name"}
                                            onValueChange={(value: "name" | "email" | "phone") => {
                                              updateFollowupStepMapping(step.id, placeholder, {
                                                ...mapping,
                                                source: "lead_field",
                                                field: value
                                              });
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Choose field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {leadFieldOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                        {mapping.source === "custom_attribute" && (
                                          <Select
                                            value={mapping.attribute ?? (customAttributeKeys[0] ?? "")}
                                            onValueChange={(value: string) => {
                                              updateFollowupStepMapping(step.id, placeholder, {
                                                ...mapping,
                                                source: "custom_attribute",
                                                attribute: value
                                              });
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder={customAttributeKeys.length === 0 ? "No custom attributes" : "Choose attribute"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {customAttributeKeys.length === 0 ? (
                                                <SelectItem value="" disabled>
                                                  No custom attributes available
                                                </SelectItem>
                                              ) : (
                                                customAttributeKeys.map((key) => (
                                                  <SelectItem key={key} value={key}>
                                                    {key}
                                                  </SelectItem>
                                                ))
                                              )}
                                            </SelectContent>
                                          </Select>
                                        )}
                                        {mapping.source === "static" && (
                                          <Input
                                            value={mapping.value ?? ""}
                                            onChange={(event) => {
                                              updateFollowupStepMapping(step.id, placeholder, {
                                                ...mapping,
                                                source: "static",
                                                value: event.target.value
                                              });
                                            }}
                                            placeholder="Enter value"
                                          />
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wide text-slate-500">Fallback (optional)</Label>
                                        <Input
                                          value={mapping.fallback_value ?? ""}
                                          onChange={(event) => {
                                            updateFollowupStepMapping(step.id, placeholder, {
                                              ...mapping,
                                              fallback_value: event.target.value
                                            });
                                          }}
                                          placeholder="Value to use if selected data is missing"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {followupSteps.length < 3 && (
                      <Button
                        variant="outline"
                        onClick={addFollowupStep}
                        className="w-full border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Follow-up Step
                      </Button>
                    )}
                  </div>
                )}
              </div>

                  <DialogFooter className="flex-col sm:flex-row gap-3 px-6 pb-6 pt-2">
                    {/* Removed Cost Estimate */}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={sending}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendCampaign} disabled={sending || !hasIntegration} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-8 shadow-md">
                        {sending ? "Sending..." : `Send to ${selectedLeads.size} Recipients`}
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign History</CardTitle>
            <CardDescription>Track performance of your WhatsApp campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Clock className="h-8 w-8 animate-spin mx-auto text-brand-orange mb-3" />
                <p className="text-slate-500 font-medium">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Send className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium mb-4">No campaigns yet</p>
                <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="border-brand-orange text-brand-orange hover:bg-brand-orange/5">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const stats = getCampaignStats(campaign);
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-brand-navy underline decoration-brand-orange/30 decoration-2 underline-offset-4">{campaign.campaign_name}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1">Template: {campaign.template_name}</p>
                        </div>
                        <Badge
                          variant={campaign.status === "COMPLETED" ? "default" : "secondary"}
                          className={cn(
                            "font-bold",
                            campaign.status === "COMPLETED" && "bg-brand-orange text-white",
                            campaign.status === "SENDING" && "bg-brand-navy text-white",
                            campaign.status === "SCHEDULED" && "bg-slate-700 text-white",
                            campaign.status === "PAUSED" && "bg-amber-500 text-white",
                            campaign.status === "STOPPED" && "bg-red-600 text-white"
                          )}
                        >
                          {campaign.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Recipients</p>
                          <p className="text-lg font-semibold">{stats.total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sent</p>
                          <p className="text-lg font-semibold text-blue-600">{stats.sent}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Failed</p>
                          <div className="flex items-center gap-1">
                            <p className="text-lg font-semibold text-red-500">{stats.failed}</p>
                            {stats.failed > 0 && campaign.status !== 'SENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryFailed(campaign.id, campaign.campaign_name);
                                }}
                                disabled={retryingCampaignIds.has(campaign.id)}
                                title="Retry failed messages"
                              >
                                {retryingCampaignIds.has(campaign.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivered</p>
                          <p className="text-lg font-semibold text-emerald-600">{stats.delivered}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Read</p>
                          <p className="text-lg font-semibold text-purple-600">{stats.read}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Replied</p>
                          <p className="text-lg font-semibold text-orange-600">{stats.replied}</p>
                        </div>
                      </div>

                      {
                        campaign.status === "SENDING" && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-blue-600 font-medium">Sending Progress</span>
                              <span className="text-slate-500">{Math.round((stats.sent / (stats.total || 1)) * 100)}%</span>
                            </div>
                            <Progress value={(stats.sent / (stats.total || 1)) * 100} className="h-2" />
                          </div>
                        )
                      }

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {format(parseISO(campaign.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>

                          {/* Pause button — for SENDING or SCHEDULED campaigns */}
                          {["SENDING", "SCHEDULED"].includes(campaign.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-500 text-amber-600 hover:bg-amber-50"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActioningCampaignIds(prev => new Set(prev).add(campaign.id));
                                try {
                                  const res = await fetch("/api/whatsapp/campaigns/status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ campaign_id: campaign.id, action: "pause" })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success(`Campaign "${campaign.campaign_name}" paused`);
                                    fetchCampaigns();
                                  } else {
                                    toast.error(data.error || "Failed to pause campaign");
                                  }
                                } catch { toast.error("Failed to pause campaign"); }
                                finally { setActioningCampaignIds(prev => { const s = new Set(prev); s.delete(campaign.id); return s; }); }
                              }}
                              disabled={actioningCampaignIds.has(campaign.id)}
                            >
                              {actioningCampaignIds.has(campaign.id) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                              Pause
                            </Button>
                          )}

                          {/* Resume button — for PAUSED campaigns */}
                          {campaign.status === "PAUSED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActioningCampaignIds(prev => new Set(prev).add(campaign.id));
                                try {
                                  const res = await fetch("/api/whatsapp/campaigns/status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ campaign_id: campaign.id, action: "resume" })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success(`Campaign "${campaign.campaign_name}" resumed`);
                                    fetchCampaigns();
                                  } else {
                                    toast.error(data.error || "Failed to resume campaign");
                                  }
                                } catch { toast.error("Failed to resume campaign"); }
                                finally { setActioningCampaignIds(prev => { const s = new Set(prev); s.delete(campaign.id); return s; }); }
                              }}
                              disabled={actioningCampaignIds.has(campaign.id)}
                            >
                              {actioningCampaignIds.has(campaign.id) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                              Resume
                            </Button>
                          )}

                          {/* Stop button — for SENDING, SCHEDULED, or PAUSED campaigns */}
                          {["SENDING", "SCHEDULED", "PAUSED"].includes(campaign.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm(`Are you sure you want to stop "${campaign.campaign_name}"? All remaining unsent messages will be cancelled.`)) return;
                                setActioningCampaignIds(prev => new Set(prev).add(campaign.id));
                                try {
                                  const res = await fetch("/api/whatsapp/campaigns/status", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ campaign_id: campaign.id, action: "stop" })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success(`Campaign "${campaign.campaign_name}" stopped`);
                                    fetchCampaigns();
                                  } else {
                                    toast.error(data.error || "Failed to stop campaign");
                                  }
                                } catch { toast.error("Failed to stop campaign"); }
                                finally { setActioningCampaignIds(prev => { const s = new Set(prev); s.delete(campaign.id); return s; }); }
                              }}
                              disabled={actioningCampaignIds.has(campaign.id)}
                            >
                              {actioningCampaignIds.has(campaign.id) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <StopCircle className="h-3 w-3 mr-1" />}
                              Stop
                            </Button>
                          )}

                          {/* Legacy resume for SENDING stuck campaigns */}
                          {campaign.status === "SENDING" && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeCampaign(campaign.id, campaign.campaign_name);
                              }}
                              disabled={resumingCampaignIds.has(campaign.id)}
                            >
                              {resumingCampaignIds.has(campaign.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Send className="h-3 w-3 mr-1" />
                              )}
                              Resume Sending
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onOpenChange={(open) => {
            setViewDialogOpen(open);
            if (!open) {
              setSelectedCampaign(null);
            }
          }}
        >
          {/* Poll for updates if viewing a sending campaign */}
          {(() => {
            useEffect(() => {
              let interval: NodeJS.Timeout;
              if (viewDialogOpen && selectedCampaign?.status === 'SENDING') {
                interval = setInterval(() => {
                  fetchCampaigns();
                }, 3000); // Update every 3 seconds
              }
              return () => clearInterval(interval);
            }, [viewDialogOpen, selectedCampaign?.status]);

            // Sync selectedCampaign with fresh data from list
            useEffect(() => {
              if (selectedCampaign && campaigns.length > 0) {
                const fresh = campaigns.find(c => c.id === selectedCampaign.id);
                if (fresh && (
                  fresh.sent_count !== selectedCampaign.sent_count ||
                  fresh.delivered_count !== selectedCampaign.delivered_count ||
                  fresh.read_count !== selectedCampaign.read_count ||
                  fresh.failed_count !== selectedCampaign.failed_count ||
                  fresh.status !== selectedCampaign.status
                )) {
                  setSelectedCampaign(fresh);
                }
              }
            }, [campaigns, selectedCampaign]);
            return null;
          })()}


          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-slate-900">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600">
                    {selectedCampaign?.campaign_name || "Campaign Details"}
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    {selectedCampaign?.created_at
                      ? `Launched on ${format(parseISO(selectedCampaign.created_at), "MMMM d, yyyy 'at' h:mm a")}`
                      : "Detailed performance analytics."}
                  </DialogDescription>
                </div>
                <Badge className={cn(
                  "px-3 py-1 text-sm font-medium",
                  selectedCampaign?.status === "COMPLETED" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                  selectedCampaign?.status === "SENDING" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                  selectedCampaign?.status === "SCHEDULED" && "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
                  selectedCampaign?.status === "PAUSED" && "bg-amber-100 text-amber-800 hover:bg-amber-100",
                  selectedCampaign?.status === "STOPPED" && "bg-red-100 text-red-800 hover:bg-red-100"
                )}>
                  {selectedCampaign?.status}
                </Badge>
              </div>
            </DialogHeader>

            {/* Fetch live stats effect handled by page-level useEffect */}

            {selectedCampaign ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
                  <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
                  <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-8">
                    {/* Logic Correction:
                   We use a "Waterfall" or "Watermark" approach to ensure the funnel is always valid (count >= next_stage).
                   1. Replied: The absolute truth of engagement.
                   2. Read: Must be at least `Replied` (you can't reply without reading, even if receipts are off).
                   3. Delivered: Must be at least `Read` (you can't read without delivery).
                */}
                    {(() => {
                      const stats = getCampaignStats(selectedCampaign);
                      return (
                        <>
                          {/* 1. Key Metrics Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-sm font-medium text-slate-500 mb-1">Total Audience</p>
                              <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <p className="text-sm font-medium text-blue-600 mb-1">Sent Successfully</p>
                              <p className="text-3xl font-bold text-blue-700">{stats.sent}</p>
                              <div className="flex gap-2 mt-1">
                                {stats.failed > 0 && <span className="text-xs text-red-500 font-medium">{stats.failed} Failed</span>}
                              </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                              <p className="text-sm font-medium text-purple-600 mb-1">Open Rate</p>
                              <p className="text-3xl font-bold text-purple-700">
                                {Math.round((stats.read / (stats.sent || 1)) * 100)}%
                              </p>
                              <p className="text-xs text-purple-500 mt-1">
                                {stats.read} Read
                              </p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                              <p className="text-sm font-medium text-orange-600 mb-1">Response Rate</p>
                              <p className="text-3xl font-bold text-orange-700">
                                {Math.round((stats.replied / (stats.sent || 1)) * 100)}%
                              </p>
                              <p className="text-xs text-orange-500 mt-1">
                                {stats.replied} Replied
                              </p>
                            </div>
                          </div>

                          {/* 2. Visual Funnel Analysis */}
                          <div className="bg-white rounded-xl border shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                Conversion Funnel
                              </h3>
                              <div className="flex gap-4 text-xs font-medium">
                                {stats.failed > 0 && (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {stats.failed} Failed
                                    {selectedCampaign.status !== 'SENDING' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-1 border border-red-200"
                                        onClick={() => handleRetryFailed(selectedCampaign.id, selectedCampaign.campaign_name)}
                                        disabled={retryingCampaignIds.has(selectedCampaign.id)}
                                      >
                                        {retryingCampaignIds.has(selectedCampaign.id) ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                        )}
                                        Retry
                                      </Button>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-6">
                              {/* Sent Stage */}
                              <div className="relative">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="font-medium text-blue-700">Sent</span>
                                  <span className="font-bold text-slate-700">{stats.sent}</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.sent / (stats.total || 1)) * 100}%` }}
                                    transition={{ duration: 1 }}
                                    className="h-full bg-blue-500 rounded-full relative"
                                  >
                                    {stats.sent < stats.total && (
                                      <div className="absolute right-0 top-0 bottom-0 h-full w-2 bg-white/20 animate-pulse" />
                                    )}
                                  </motion.div>
                                </div>
                                <div className="absolute right-0 -top-6 text-xs text-slate-400">
                                  {Math.round((stats.sent / (stats.total || 1)) * 100)}% Complete
                                </div>
                              </div>

                              {/* Delivered Stage (Cumulative) */}
                              <div className="relative">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="font-medium text-emerald-700">Delivered</span>
                                  <span className="font-bold text-slate-700">{stats.delivered}</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.delivered / (stats.sent || 1)) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                    className="h-full bg-emerald-500 rounded-full"
                                  />
                                </div>
                                <div className="absolute right-0 -top-6 text-xs text-slate-400">
                                  {Math.round((stats.delivered / (stats.sent || 1)) * 100)}% Delivery
                                </div>
                              </div>

                              {/* Read Stage (Cumulative) */}
                              <div className="relative">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="font-medium text-purple-700">Read</span>
                                  <span className="font-bold text-slate-700">{stats.read}</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.read / (stats.sent || 1)) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                    className="h-full bg-purple-500 rounded-full"
                                  />
                                </div>
                                <div className="absolute right-0 -top-6 text-xs text-slate-400">
                                  {Math.round((stats.read / (stats.sent || 1)) * 100)}% of Sent
                                </div>
                              </div>

                              {/* Replied Stage (Base) */}
                              <div className="relative">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="font-medium text-orange-700">Replied</span>
                                  <span className="font-bold text-slate-700">{stats.replied}</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.replied / (stats.sent || 1)) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                    className="h-full bg-orange-500 rounded-full"
                                  />
                                </div>
                                <div className="absolute right-0 -top-6 text-xs text-slate-400">
                                  {Math.round((stats.replied / (stats.sent || 1)) * 100)}% of Sent
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* 3. Automated Follow-up Sequence (if exists) */}
                    {selectedCampaign.followup_config && selectedCampaign.followup_config.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Bot className="h-4 w-4 text-emerald-500" />
                          Automated Follow-up Sequence
                        </h3>
                        <div className="space-y-4">
                          {/* We use a self-contained component logic here or just fetch in useEffect inside the main component if simpler */}
                          {/* Since we can't easily add a new component in this Replace block without context, we will implement the fetch logic in the CampaignDetailsDialog component part (if possible) or just inline a Fetcher component */}
                          <FollowupDetailsFetcher campaignId={selectedCampaign.id} initialConfig={selectedCampaign.followup_config} />
                        </div>
                      </div>
                    )}

                    {/* 4. Message Preview */}
                    {/* 4. Message Preview */}
                    {selectedCampaign.template_body && (
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          Message Content (Template)
                        </h3>
                        <div className="bg-white rounded-lg border border-slate-200 shadow-inner overflow-hidden max-w-sm">
                          {/* Header */}
                          {selectedCampaign.template_header_type && (
                            <div className="bg-slate-100 border-b text-xs text-slate-500 font-medium overflow-hidden">
                              {selectedCampaign.template_header_type === "TEXT" && (
                                <div className="p-3">{selectedCampaign.template_header_text}</div>
                              )}
                              {(selectedCampaign.template_header_type === "IMAGE" || selectedCampaign.template_header_type === "VIDEO") && selectedCampaign.template_header_media_url ? (
                                <div className="relative h-32 w-full bg-slate-200">
                                  {selectedCampaign.template_header_type === "IMAGE" ? (
                                    <img
                                      src={selectedCampaign.template_header_media_url}
                                      alt="Header"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <div className="bg-white/90 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">VIDEO HEADER</div>
                                    </div>
                                  )}
                                </div>
                              ) : (selectedCampaign.template_header_type !== "TEXT" && (
                                <div className="p-3 bg-slate-100 flex items-center justify-center text-slate-400">
                                  [{selectedCampaign.template_header_type} HEADER]
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Body */}
                          <div className="p-4 whitespace-pre-wrap text-sm text-slate-800">
                            {selectedCampaign.template_body}
                          </div>

                          {/* Footer */}
                          {selectedCampaign.template_footer_text && (
                            <div className="px-4 pb-2 text-xs text-slate-400">
                              {selectedCampaign.template_footer_text}
                            </div>
                          )}

                          {/* Buttons */}
                          {selectedCampaign.template_buttons && selectedCampaign.template_buttons.length > 0 && (
                            <div className="border-t divide-y">
                              {selectedCampaign.template_buttons.map((btn: any, idx: number) => (
                                <div key={idx} className="p-3 text-center text-blue-600 text-sm font-medium hover:bg-slate-50 cursor-default">
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5. Campaign Configuration Details */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <span className="text-sm text-slate-500 block mb-1">Template Used</span>
                          <span className="font-medium text-slate-800 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            {selectedCampaign.template_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 block mb-1">Schedule</span>
                          <div className="space-y-1">
                            {selectedCampaign.started_at && (
                              <p className="text-sm">
                                <span className="text-emerald-600 font-medium">Started:</span>{" "}
                                {format(parseISO(selectedCampaign.started_at), "MMM d, h:mm a")}
                              </p>
                            )}
                            {selectedCampaign.completed_at && (
                              <p className="text-sm">
                                <span className="text-blue-600 font-medium">Completed:</span>{" "}
                                {format(parseISO(selectedCampaign.completed_at), "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="daily" className="mt-4">
                  <CampaignDailyStats campaignId={selectedCampaign.id} />
                </TabsContent>

                <TabsContent value="failures" className="mt-4">
                  <CampaignFailureAnalysis campaignId={selectedCampaign.id} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Search className="h-12 w-12 mb-4 text-slate-300" />
                <p>Select a campaign to view detailed analytics.</p>
              </div>
            )}

            <DialogFooter className="mt-6 border-t pt-4">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close Analytics</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
}
