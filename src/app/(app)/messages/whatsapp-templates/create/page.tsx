"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Save, Type, Image as ImageIcon, Video, FileText, MapPin, Bold, Italic, Code, UploadCloud, Loader2, Trash2, Plus, CurlyBraces, Sparkles, Wand2, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type TemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";
type TemplateType = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
type ButtonLayout = "NONE" | "QUICK_REPLY" | "CALL_TO_ACTION" | "FLOW";

interface WhatsAppNumber {
  id: string;
  ai_name: string | null;
}

interface Flow {
  id: string;
  flow_id: string | null;
  name: string;
  status: string;
  builder_state: any;
}

export default function CreateTemplatePage() {
  const { user } = useUser();
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [creating, setCreating] = useState(false);

  // Form state
  const [ais, setAis] = useState<WhatsAppNumber[]>([]);
  const [selectedAi, setSelectedAi] = useState<string>("");
  const [loadingAis, setLoadingAis] = useState<boolean>(false);
  const [hasIntegration, setHasIntegration] = useState(true);
  const [validAiIds, setValidAiIds] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("UTILITY");
  const [templateType, setTemplateType] = useState<TemplateType>("TEXT");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [bodyVariableExamples, setBodyVariableExamples] = useState<Record<string, string>>({});
  const [buttonLayout, setButtonLayout] = useState<ButtonLayout>("NONE");
  const [quickReplies, setQuickReplies] = useState<string[]>([""]);
  const [ctaPhoneEnabled, setCtaPhoneEnabled] = useState(false);
  const [ctaPhoneText, setCtaPhoneText] = useState("");
  const [ctaPhoneNumber, setCtaPhoneNumber] = useState("");
  const [ctaWebsiteEnabled, setCtaWebsiteEnabled] = useState(false);
  const [ctaWebsiteText, setCtaWebsiteText] = useState("");
  const [ctaWebsiteUrl, setCtaWebsiteUrl] = useState("");
  const [flowButtonEnabled, setFlowButtonEnabled] = useState(false);
  const [flowButtonText, setFlowButtonText] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [headerUploadLoading, setHeaderUploadLoading] = useState(false);
  const [headerUploadError, setHeaderUploadError] = useState<string | null>(null);
  const [headerMediaFileName, setHeaderMediaFileName] = useState<string | null>(null);
  const [headerMediaContentType, setHeaderMediaContentType] = useState<string | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Nano Banana AI image generation state
  const [headerImageMode, setHeaderImageMode] = useState<"upload" | "ai">("upload");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAspectRatio, setAiAspectRatio] = useState("1:1");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerateError, setAiGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const loadAis = async () => {
      if (!user?.id) return;
      setLoadingAis(true);
      try {
        const { data: aisData, error: aisError } = await supabase
          .from("business_info")
          .select("id, ai_name")
          .eq("user_id", user.id);

        if (aisError) {
          console.error("Error loading WhatsApp numbers:", aisError);
          toast.error("Failed to load WhatsApp numbers");
          return;
        }

        const { data: intData, error: intError } = await supabase
          .from("whatsapp_integrations")
          .select("ai_id")
          .eq("user_id", user.id);

        if (intError) throw intError;

        const validIds = new Set(intData?.map(i => i.ai_id) || []);
        setValidAiIds(validIds);

        const list = aisData || [];
        setAis(list);
        if (list.length > 0) {
          setSelectedAi(prev => prev || list[0].id);
        }
      } catch (err) {
        console.error("Error loading WhatsApp numbers:", err);
        toast.error("Failed to load WhatsApp numbers");
      } finally {
        setLoadingAis(false);
      }
    };

    loadAis();
  }, [user, supabase]);

  useEffect(() => {
    if (templateType === "TEXT") {
      setHeaderMediaUrl("");
      setHeaderMediaFileName(null);
      setHeaderMediaContentType(null);
    } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(templateType)) {
      setHeaderText("");
    }
    setHeaderUploadError(null);
  }, [templateType]);

  useEffect(() => {
    if (selectedAi) {
      setHasIntegration(validAiIds.has(selectedAi));
    }
  }, [selectedAi, validAiIds]);

  useEffect(() => {
    const loadFlows = async () => {
      if (!selectedAi) {
        setFlows([]);
        return;
      }
      setLoadingFlows(true);
      try {
        const res = await fetch(`/api/whatsapp/flows/list?ai_id=${selectedAi}`);
        const data = await res.json();
        if (data.success && data.flows) {
          // Only show published flows
          const publishedFlows = data.flows.filter((f: Flow) => f.status === "PUBLISHED");
          setFlows(publishedFlows);
        } else {
          setFlows([]);
        }
      } catch (err) {
        console.error("Error loading flows:", err);
        setFlows([]);
      } finally {
        setLoadingFlows(false);
      }
    };

    loadFlows();
  }, [selectedAi]);

  useEffect(() => {
    if (buttonLayout === "QUICK_REPLY") {
      setCtaPhoneEnabled(false);
      setCtaPhoneText("");
      setCtaPhoneNumber("");
      setCtaWebsiteEnabled(false);
      setCtaWebsiteText("");
      setCtaWebsiteUrl("");
      setFlowButtonEnabled(false);
      setFlowButtonText("");
      setSelectedFlowId("");
      if (quickReplies.length === 0) {
        setQuickReplies([""]);
      }
    } else if (buttonLayout === "CALL_TO_ACTION") {
      setQuickReplies([""]);
      setFlowButtonEnabled(false);
      setFlowButtonText("");
      setSelectedFlowId("");
    } else if (buttonLayout === "FLOW") {
      setQuickReplies([""]);
      setCtaPhoneEnabled(false);
      setCtaPhoneText("");
      setCtaPhoneNumber("");
      setCtaWebsiteEnabled(false);
      setCtaWebsiteText("");
      setCtaWebsiteUrl("");
    } else {
      setQuickReplies([""]);
      setCtaPhoneEnabled(false);
      setCtaPhoneText("");
      setCtaPhoneNumber("");
      setCtaWebsiteEnabled(false);
      setCtaWebsiteText("");
      setCtaWebsiteUrl("");
      setFlowButtonEnabled(false);
      setFlowButtonText("");
      setSelectedFlowId("");
    }
  }, [buttonLayout]);

  const bodyPlaceholderNumbers = useMemo(() => {
    const matches = Array.from(bodyText.matchAll(/{{\s*(\d+)\s*}}/g));
    const numbers = Array.from(new Set(matches.map((match) => Number(match[1])))).filter((value) => !Number.isNaN(value));
    numbers.sort((a, b) => a - b);
    return numbers;
  }, [bodyText]);

  const bodyPlaceholders = useMemo(() => bodyPlaceholderNumbers.map((num) => `{{${num}}}`), [bodyPlaceholderNumbers]);

  useEffect(() => {
    setBodyVariableExamples((prev) => {
      const next: Record<string, string> = {};
      bodyPlaceholders.forEach((placeholder) => {
        next[placeholder] = prev[placeholder] ?? "";
      });
      return next;
    });
  }, [bodyPlaceholders]);

  const bodyPlaceholdersSequential = useMemo(
    () => bodyPlaceholderNumbers.every((num, index) => num === index + 1),
    [bodyPlaceholderNumbers]
  );

  const nextBodyPlaceholderLabel = useMemo(() => {
    const last = bodyPlaceholderNumbers.length > 0 ? Math.max(...bodyPlaceholderNumbers) : 0;
    return `{{${last + 1}}}`;
  }, [bodyPlaceholderNumbers]);

  const insertBodyVariable = () => {
    const nextIndex = bodyPlaceholderNumbers.length > 0 ? Math.max(...bodyPlaceholderNumbers) + 1 : 1;
    const placeholder = `{{${nextIndex}}}`;
    const textarea = bodyTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart ?? bodyText.length;
      const end = textarea.selectionEnd ?? start;
      const newValue = `${bodyText.slice(0, start)}${placeholder}${bodyText.slice(end)}`;
      setBodyText(newValue);

      requestAnimationFrame(() => {
        const caretPosition = start + placeholder.length;
        textarea.setSelectionRange(caretPosition, caretPosition);
        textarea.focus();
      });
    } else {
      setBodyText((prev) => prev + placeholder);
    }
  };

  const handleBodyExampleChange = (placeholder: string, value: string) => {
    setBodyVariableExamples((prev) => ({
      ...prev,
      [placeholder]: value,
    }));
  };

  const headerAcceptMap: Record<TemplateType, string> = {
    TEXT: "",
    IMAGE: "image/jpeg,image/png",
    VIDEO: "video/mp4,video/3gpp,video/quicktime",
    DOCUMENT: "application/pdf",
    LOCATION: "",
  };

  const openHeaderFilePicker = () => {
    if (!selectedAi) {
      toast.error("Select a WhatsApp number before uploading media");
      return;
    }
    headerFileInputRef.current?.click();
  };

  const handleHeaderFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedAi) {
      toast.error("Select a WhatsApp number before uploading media");
      event.target.value = "";
      return;
    }

    if (!headerAcceptMap[templateType]) {
      toast.error("Selected template type does not support media uploads");
      event.target.value = "";
      return;
    }

    setHeaderUploadLoading(true);
    setHeaderUploadError(null);

    try {
      // 1. Get signed upload URL
      const authorizeResp = await fetch("/api/whatsapp/templates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_id: selectedAi,
          header_type: templateType,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        }),
      });

      const authorizeData = await authorizeResp.json().catch(() => ({}));

      if (!authorizeResp.ok || !authorizeData?.success || !authorizeData?.signedUrl) {
        const msg = authorizeData?.error || "Failed to authorize media upload";
        throw new Error(msg);
      }

      // 2. Upload directly to Supabase Storage using the pre-signed URL
      const { error: uploadError } = await supabase.storage
        .from("ai-files")
        .uploadToSignedUrl(authorizeData.path, authorizeData.token, file);

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload media to storage");
      }

      // 3. Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("ai-files")
        .getPublicUrl(authorizeData.path);

      if (!urlData?.publicUrl) {
        throw new Error("Failed to obtain public URL");
      }

      setHeaderMediaUrl(urlData.publicUrl);
      setHeaderMediaFileName(authorizeData.file_name || file.name);
      setHeaderMediaContentType(authorizeData.content_type || file.type);
      toast.success("Media uploaded successfully");
      event.target.value = "";
    } catch (err: any) {
      console.error("Media upload failed", err);
      setHeaderUploadError(err?.message || "Failed to upload media");
      toast.error(err?.message || "Failed to upload media");
    } finally {
      setHeaderUploadLoading(false);
    }
  };

  const clearHeaderMedia = () => {
    setHeaderMediaUrl("");
    setHeaderMediaFileName(null);
    setHeaderMediaContentType(null);
    setHeaderUploadError(null);
    setAiGenerateError(null);
  };

  // Nano Banana AI image generation handler
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a prompt to generate an image");
      return;
    }
    if (!selectedAi) {
      toast.error("Select a WhatsApp number first");
      return;
    }

    setAiGenerating(true);
    setAiGenerateError(null);

    try {
      const resp = await fetch("/api/whatsapp/templates/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          ai_id: selectedAi,
          aspect_ratio: aiAspectRatio,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.success) {
        const msg = data?.error || "Failed to generate image";
        throw new Error(msg);
      }

      setHeaderMediaUrl(data.publicUrl);
      setHeaderMediaFileName(data.fileName || "ai-generated.png");
      setHeaderMediaContentType(data.contentType || "image/png");
      toast.success("Image generated successfully!");
    } catch (err: any) {
      console.error("AI image generation failed", err);
      setAiGenerateError(err?.message || "Failed to generate image");
      toast.error(err?.message || "Failed to generate image");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedAi) {
      toast.error("Select the WhatsApp number (AI) to associate this template with");
      return;
    }

    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(templateName)) {
      toast.error("Template name must contain only lowercase letters, numbers, and underscores");
      return;
    }

    if (!bodyText.trim()) {
      toast.error("Template body is required");
      return;
    }

    if (["IMAGE", "VIDEO", "DOCUMENT"].includes(templateType) && !headerMediaUrl.trim()) {
      toast.error("Provide a publicly accessible media URL for the header");
      return;
    }

    if (bodyPlaceholders.length > 0 && !bodyPlaceholdersSequential) {
      toast.error("Body variables must be sequential like {{1}}, {{2}}, ...");
      return;
    }

    if (bodyPlaceholders.length > 0) {
      const missingExample = bodyPlaceholders.some((placeholder) => !bodyVariableExamples[placeholder]?.trim());
      if (missingExample) {
        toast.error("Provide example values for each body variable");
        return;
      }
    }

    let buttonType: ButtonLayout | null = buttonLayout === "NONE" ? null : buttonLayout;
    let buttonsPayload: any[] | null = null;

    if (buttonLayout === "QUICK_REPLY") {
      const replies = quickReplies
        .map((reply) => reply.trim())
        .filter((reply) => reply.length > 0);

      if (replies.length === 0) {
        toast.error("Add at least one quick reply button");
        return;
      }

      if (replies.length > 3) {
        toast.error("You can add up to 3 quick reply buttons");
        return;
      }

      if (replies.some((text) => text.length > 20)) {
        toast.error("Quick reply text must be 20 characters or fewer");
        return;
      }

      buttonsPayload = replies.map((text) => ({ type: "QUICK_REPLY", text }));
    } else if (buttonLayout === "CALL_TO_ACTION") {
      const ctaButtons: any[] = [];

      if (ctaPhoneEnabled) {
        const phoneLabel = ctaPhoneText.trim();
        const phoneNumber = ctaPhoneNumber.trim();

        if (!phoneLabel) {
          toast.error("Provide button text for the phone call action");
          return;
        }

        if (phoneLabel.length > 20) {
          toast.error("Phone call button text must be 20 characters or fewer");
          return;
        }

        if (!phoneNumber) {
          toast.error("Provide a phone number for the call action");
          return;
        }

        ctaButtons.push({
          type: "PHONE_NUMBER",
          text: phoneLabel,
          phone_number: phoneNumber,
        });
      }

      if (ctaWebsiteEnabled) {
        const websiteLabel = ctaWebsiteText.trim();
        const websiteUrl = ctaWebsiteUrl.trim();

        if (!websiteLabel) {
          toast.error("Provide button text for the website action");
          return;
        }

        if (websiteLabel.length > 20) {
          toast.error("Website button text must be 20 characters or fewer");
          return;
        }

        if (!websiteUrl) {
          toast.error("Provide a URL for the website action");
          return;
        }

        if (!/^https?:\/\//i.test(websiteUrl)) {
          toast.error("Website URL must start with http:// or https://");
          return;
        }

        ctaButtons.push({
          type: "URL",
          text: websiteLabel,
          url: websiteUrl,
        });
      }

      if (ctaButtons.length === 0) {
        toast.error("Enable at least one call-to-action button");
        return;
      }

      if (ctaButtons.length > 2) {
        toast.error("Call-to-action templates support up to 2 buttons (phone and website)");
        return;
      }

      buttonsPayload = ctaButtons;
    } else if (buttonLayout === "FLOW") {
      if (!selectedFlowId) {
        toast.error("Select a flow for the button");
        return;
      }

      if (!flowButtonText.trim()) {
        toast.error("Provide button text for the flow");
        return;
      }

      if (flowButtonText.trim().length > 20) {
        toast.error("Flow button text must be 20 characters or fewer");
        return;
      }

      // Get the selected flow to retrieve its Meta flow_id
      const selectedFlow = flows.find(f => f.id === selectedFlowId);
      if (!selectedFlow || !selectedFlow.flow_id) {
        toast.error("Selected flow is not properly synced to Meta");
        return;
      }

      // Get entry screen ID from builder state
      let firstScreenId = "SCREEN_0"; // Fallback
      if (selectedFlow.builder_state && selectedFlow.builder_state.screens && selectedFlow.builder_state.screens.length > 0) {
        firstScreenId = selectedFlow.builder_state.screens[0].id;
      }

      buttonsPayload = [{
        type: "FLOW",
        text: flowButtonText.trim(),
        flow_id: selectedFlow.flow_id, // Use Meta's flow_id
        navigate_screen: firstScreenId
      }];
    }

    setCreating(true);
    try {
      // Build payload for backend API
      const payload: Record<string, any> = {
        ai_id: selectedAi,
        template_name: templateName,
        category,
        language: "en",
        header_type: templateType,
        header_text: headerText || null,
        header_media_url: headerMediaUrl || null,
        body_text: bodyText,
        footer_text: footerText || null,
        body_examples: bodyPlaceholders.length > 0 ? bodyPlaceholders.map((placeholder) => bodyVariableExamples[placeholder].trim()) : [],
        parameter_format: bodyPlaceholders.length > 0 ? "positional" : null,
        button_type: buttonType,
        buttons: buttonsPayload,
      };

      const resp = await fetch("/api/whatsapp/templates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.success) {
        const err = data?.error || data?.message || "Failed to create template";
        throw new Error(typeof err === "string" ? err : JSON.stringify(err));
      }

      toast.success("Template created and submitted for approval!");
      setTimeout(() => {
        router.push(`/whatsapp-templates/list?ai_id=${encodeURIComponent(selectedAi)}`);
      }, 1000);
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast.error(error?.message || "Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        title="Create WhatsApp Template"
        description="Design your message template and submit for Meta approval"
        showTitleInHeader={false}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/whatsapp-templates")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
                <CardDescription>Basic details about your message template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiSelect">WhatsApp Number *</Label>
                  <Select
                    value={selectedAi}
                    onValueChange={setSelectedAi}
                    disabled={loadingAis || ais.length === 0}
                  >
                    <SelectTrigger id="aiSelect">
                      <SelectValue placeholder={loadingAis ? "Loading numbers..." : "Select WhatsApp number"} />
                    </SelectTrigger>
                    <SelectContent>
                      {ais.map(ai => (
                        <SelectItem key={ai.id} value={ai.id}>
                          {ai.ai_name || "Unnamed AI"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {ais.length === 0 && !loadingAis && (
                    <p className="text-xs text-red-500">No WhatsApp numbers found. Connect an integration first.</p>
                  )}
                  {!hasIntegration && selectedAi && (
                    <div className="mt-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                      <p className="font-medium">No WhatsApp Integration Found</p>
                      <p className="mt-1">This AI does not have a connected WhatsApp number. Please connect one in Integrations.</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    placeholder="e.g., welcome_message_001"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  />
                  <p className="text-xs text-gray-500">Only lowercase letters, numbers, and underscores. Must be unique.</p>
                </div>
              </CardContent>
            </Card>

            {/* Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Template Category *</CardTitle>
                <CardDescription>Choose the category that best fits your template usage</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={category} onValueChange={(value) => setCategory(value as TemplateCategory)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="UTILITY" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                      Utility
                    </TabsTrigger>
                    <TabsTrigger value="MARKETING" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                      Marketing
                    </TabsTrigger>
                    <TabsTrigger value="AUTHENTICATION" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                      Authentication
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="UTILITY" className="mt-4">
                    <p className="text-sm text-gray-600">
                      For transactional messages like order updates, shipping notifications, account alerts, and appointment reminders.
                    </p>
                  </TabsContent>
                  <TabsContent value="MARKETING" className="mt-4">
                    <p className="text-sm text-gray-600">
                      For promotional content like sales announcements, new product launches, and special offers. Requires opt-in.
                    </p>
                  </TabsContent>
                  <TabsContent value="AUTHENTICATION" className="mt-4">
                    <p className="text-sm text-gray-600">
                      For one-time passwords (OTP) and verification codes. Must include security-related content.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Template Type */}
            <Card>
              <CardHeader>
                <CardTitle>Template Type</CardTitle>
                <CardDescription>Select the media type for your template header</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={templateType} onValueChange={(value) => setTemplateType(value as TemplateType)}>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <RadioGroupItem value="TEXT" id="text" className="peer sr-only" />
                      <Label
                        htmlFor="text"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 cursor-pointer"
                      >
                        <Type className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Text</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="IMAGE" id="image" className="peer sr-only" />
                      <Label
                        htmlFor="image"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 cursor-pointer"
                      >
                        <ImageIcon className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Image</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="VIDEO" id="video" className="peer sr-only" />
                      <Label
                        htmlFor="video"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 cursor-pointer"
                      >
                        <Video className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Video</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="DOCUMENT" id="document" className="peer sr-only" />
                      <Label
                        htmlFor="document"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 cursor-pointer"
                      >
                        <FileText className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Document</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="LOCATION" id="location" className="peer sr-only" disabled />
                      <Label
                        htmlFor="location"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 text-gray-400 cursor-not-allowed"
                      >
                        <MapPin className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Location (soon)</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Template Header (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle>Template Header (Optional)</CardTitle>
                <CardDescription>
                  {templateType === "TEXT"
                    ? "Header text will be displayed at the top of your message"
                    : templateType === "IMAGE"
                      ? "Upload an image or generate one with AI"
                      : templateType === "VIDEO"
                        ? "Provide a direct HTTPS URL to your video file (MP4)."
                        : templateType === "DOCUMENT"
                          ? "Provide a direct HTTPS URL to your document file (PDF)."
                          : "Location headers are not yet supported."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templateType === "TEXT" && (
                  <>
                    <Input
                      placeholder="Enter header text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      maxLength={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">{headerText.length}/60 characters</p>
                  </>
                )}

                {templateType === "IMAGE" && (
                  <div className="space-y-4">
                    {/* Mode toggle: Upload vs AI Generate */}
                    <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                      <button
                        type="button"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${headerImageMode === "upload"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                          }`}
                        onClick={() => setHeaderImageMode("upload")}
                      >
                        <UploadCloud className="h-4 w-4" />
                        Upload Image
                      </button>
                      <button
                        type="button"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${headerImageMode === "ai"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                          }`}
                        onClick={() => setHeaderImageMode("ai")}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </button>
                    </div>

                    {/* Upload mode */}
                    {headerImageMode === "upload" && (
                      <div className="space-y-3">
                        <input
                          key={templateType}
                          ref={headerFileInputRef}
                          type="file"
                          accept={headerAcceptMap[templateType]}
                          onChange={handleHeaderFileChange}
                          className="hidden"
                          disabled={headerUploadLoading}
                        />
                        <div className="border border-dashed border-gray-300 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Upload media file</p>
                              <p className="text-xs text-gray-500 mt-1">Allowed: JPG, PNG up to 5MB</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" disabled={headerUploadLoading} onClick={openHeaderFilePicker}>
                              {headerUploadLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4 mr-2" />
                                  Upload
                                </>
                              )}
                            </Button>
                          </div>
                          {headerUploadError && (
                            <p className="text-xs text-red-500 mt-3">{headerUploadError}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Meta requires a publicly accessible HTTPS URL. Uploaded files are stored securely and made public for review.
                        </p>
                      </div>
                    )}

                    {/* AI Generate mode */}
                    {headerImageMode === "ai" && (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                            <Wand2 className="h-4 w-4" />
                            Nano Banana AI Image Generator
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-700">Describe the image you want</Label>
                            <Textarea
                              placeholder="e.g., A professional marketing banner for a coffee shop with warm tones, showing a latte art cup on a wooden table with soft bokeh background"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              rows={3}
                              className="bg-white"
                              disabled={aiGenerating}
                            />
                          </div>
                          <div className="flex items-end gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-gray-600">Aspect Ratio</Label>
                              <Select value={aiAspectRatio} onValueChange={setAiAspectRatio} disabled={aiGenerating}>
                                <SelectTrigger className="w-[130px] bg-white h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1:1">1:1 Square</SelectItem>
                                  <SelectItem value="16:9">16:9 Wide</SelectItem>
                                  <SelectItem value="9:16">9:16 Tall</SelectItem>
                                  <SelectItem value="4:3">4:3 Standard</SelectItem>
                                  <SelectItem value="3:4">3:4 Portrait</SelectItem>
                                  <SelectItem value="4:1">4:1 Banner</SelectItem>
                                  <SelectItem value="1:4">1:4 Story</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              disabled={aiGenerating || !aiPrompt.trim() || !selectedAi}
                              onClick={handleAiGenerate}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            >
                              {aiGenerating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Image
                                </>
                              )}
                            </Button>
                          </div>
                          {aiGenerateError && (
                            <p className="text-xs text-red-500">{aiGenerateError}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Powered by Google Gemini (Nano Banana). Generated images are automatically saved and used as your template header.
                        </p>
                      </div>
                    )}

                    {/* Shared: show uploaded/generated media preview */}
                    {headerMediaUrl && (
                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex flex-col">
                        {headerMediaContentType?.startsWith("image/") && (
                          <div className="w-full bg-gray-200/50 flex justify-center items-center p-4">
                            <img
                              src={headerMediaUrl}
                              alt="Generated or uploaded header"
                              className="max-w-full max-h-[300px] object-contain rounded-md shadow-sm border border-gray-100"
                            />
                          </div>
                        )}
                        <div className="p-3 text-sm flex items-start justify-between bg-white border-t border-gray-200">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 break-all">{headerMediaFileName || "Media file"}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{headerMediaContentType}</span>
                              <a
                                href={headerMediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                View original <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearHeaderMedia}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {["VIDEO", "DOCUMENT"].includes(templateType) && (
                  <div className="space-y-3">
                    <input
                      key={templateType}
                      ref={headerFileInputRef}
                      type="file"
                      accept={headerAcceptMap[templateType]}
                      onChange={handleHeaderFileChange}
                      className="hidden"
                      disabled={headerUploadLoading}
                    />
                    <div className="border border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Upload media file</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {templateType === "VIDEO" && "Allowed: MP4, 3GPP, MOV up to 16MB"}
                            {templateType === "DOCUMENT" && "Allowed: PDF up to 100MB"}
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" disabled={headerUploadLoading} onClick={openHeaderFilePicker}>
                          {headerUploadLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-4 w-4 mr-2" />
                              Upload
                            </>
                          )}
                        </Button>
                      </div>
                      {headerUploadError && (
                        <p className="text-xs text-red-500 mt-3">{headerUploadError}</p>
                      )}
                      {headerMediaUrl && (
                        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{headerMediaFileName || "Uploaded media"}</p>
                            <p className="text-xs text-gray-500">{headerMediaContentType}</p>
                            <a
                              href={headerMediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-600 underline"
                            >
                              View uploaded file
                            </a>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={clearHeaderMedia}>
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Meta requires a publicly accessible HTTPS URL. Uploaded files are stored securely and made public for review.
                    </p>
                  </div>
                )}

                {templateType === "LOCATION" && (
                  <p className="text-sm text-gray-500">
                    Location headers are currently disabled while we finish support.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Template Body */}
            <Card>
              <CardHeader>
                <CardTitle>Template Body *</CardTitle>
                <CardDescription>Main message content. Use variables like {`{{1}}`}, {`{{2}}`} for personalization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Code className="h-4 w-4" />
                  </Button>
                  <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={insertBodyVariable}
                    >
                      <CurlyBraces className="h-4 w-4 mr-1" />
                      Insert variable
                    </Button>
                    <span>Next: {nextBodyPlaceholderLabel}</span>
                  </div>
                </div>
                <Textarea
                  placeholder="Enter your message here..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  maxLength={1024}
                  ref={bodyTextareaRef}
                />
                <p className="text-xs text-gray-500">{bodyText.length}/1024 characters</p>
                {bodyPlaceholders.length > 0 && (
                  <div className="space-y-3 rounded-md border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="text-xs text-gray-700">
                      Provide example values for Meta review. These are required for template approval.
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bodyPlaceholders.map((placeholder) => (
                        <div key={placeholder} className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Example for {placeholder}</Label>
                          <Input
                            value={bodyVariableExamples[placeholder] ?? ""}
                            onChange={(e) => handleBodyExampleChange(placeholder, e.target.value)}
                            placeholder="e.g., Jessica"
                          />
                        </div>
                      ))}
                    </div>
                    {!bodyPlaceholdersSequential && (
                      <p className="text-xs text-red-600">
                        Variables must be numbered sequentially starting from {"{{1}}"}. Adjust your message before submitting.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Footer (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle>Template Footer (Optional)</CardTitle>
                <CardDescription>Add a footer note to your message</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Reply STOP to opt out"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">{footerText.length}/60 characters</p>
              </CardContent>
            </Card>

            {/* Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Action Buttons (Optional)</CardTitle>
                <CardDescription>Add interactive buttons to your template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={buttonLayout} onValueChange={(value) => setButtonLayout(value as ButtonLayout)}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NONE" id="none" />
                      <Label htmlFor="none">No buttons</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CALL_TO_ACTION" id="cta" />
                      <Label htmlFor="cta">Call to Action (Phone / Website)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="QUICK_REPLY" id="quick" />
                      <Label htmlFor="quick">Quick Reply (up to 3 responses)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="FLOW" id="flow" />
                      <Label htmlFor="flow">Flow Button (Interactive Form)</Label>
                    </div>
                  </div>
                </RadioGroup>

                {buttonLayout === "QUICK_REPLY" && (
                  <div className="space-y-4 pt-3 border-t">
                    <div className="space-y-3">
                      {quickReplies.map((reply, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                          <Input
                            placeholder={`Quick reply ${index + 1}`}
                            value={reply}
                            onChange={(e) => {
                              const value = e.target.value;
                              setQuickReplies((prev) => prev.map((r, i) => (i === index ? value : r)));
                            }}
                            maxLength={20}
                          />
                          {quickReplies.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-2 sm:mt-0"
                              onClick={() => setQuickReplies((prev) => prev.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {quickReplies.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                          onClick={() => setQuickReplies((prev) => [...prev, ""])}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add quick reply
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Up to 3 quick replies are allowed. Each label must be 20 characters or fewer.
                    </p>
                  </div>
                )}

                {buttonLayout === "CALL_TO_ACTION" && (
                  <div className="space-y-4 pt-3 border-t">
                    <div className="flex items-start justify-between gap-4 border rounded-lg p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone call button</p>
                        <p className="text-xs text-gray-500">Launches the dialer with the number you provide. Label max 20 characters.</p>
                      </div>
                      <Switch checked={ctaPhoneEnabled} onCheckedChange={setCtaPhoneEnabled} />
                    </div>
                    {ctaPhoneEnabled && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <Input
                            placeholder="Call us"
                            value={ctaPhoneText}
                            onChange={(e) => setCtaPhoneText(e.target.value)}
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            placeholder="+1234567890"
                            value={ctaPhoneNumber}
                            onChange={(e) => setCtaPhoneNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4 border rounded-lg p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Website button</p>
                        <p className="text-xs text-gray-500">Opens a webpage. Provide a full URL (http:// or https://). Label max 20 characters.</p>
                      </div>
                      <Switch checked={ctaWebsiteEnabled} onCheckedChange={setCtaWebsiteEnabled} />
                    </div>
                    {ctaWebsiteEnabled && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <Input
                            placeholder="View offer"
                            value={ctaWebsiteText}
                            onChange={(e) => setCtaWebsiteText(e.target.value)}
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Website URL</Label>
                          <Input
                            placeholder="https://example.com"
                            value={ctaWebsiteUrl}
                            onChange={(e) => setCtaWebsiteUrl(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Meta allows up to one call phone button and one website button per template.
                    </p>
                  </div>
                )}

                {buttonLayout === "FLOW" && (
                  <div className="space-y-4 pt-3 border-t">
                    <div className="space-y-3">
                      <Label>Select Flow *</Label>
                      <Select
                        value={selectedFlowId}
                        onValueChange={setSelectedFlowId}
                        disabled={loadingFlows || flows.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingFlows ? "Loading flows..." : flows.length === 0 ? "No published flows available" : "Select a flow"} />
                        </SelectTrigger>
                        <SelectContent>
                          {flows.map(flow => (
                            <SelectItem key={flow.id} value={flow.id}>
                              {flow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {flows.length === 0 && !loadingFlows && (
                        <p className="text-xs text-amber-600">
                          No published flows found. Create and publish a flow first.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Button Text *</Label>
                      <Input
                        placeholder="e.g., Book Now, Fill Form, Get Started"
                        value={flowButtonText}
                        onChange={(e) => setFlowButtonText(e.target.value)}
                        maxLength={20}
                      />
                      <p className="text-xs text-gray-500">{flowButtonText.length}/20 characters</p>
                    </div>

                    <p className="text-xs text-gray-500">
                      When users tap this button, the selected Flow will open as an interactive form within WhatsApp.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/whatsapp-templates")}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={creating || !hasIntegration}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create & Submit for Approval"}
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>How your template will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-b from-green-50 to-green-100 rounded-lg p-4">
                    <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                      {headerText && (
                        <div className="font-semibold text-gray-900 pb-2 border-b">{headerText}</div>
                      )}
                      {templateType !== "TEXT" && (
                        <div className={`flex items-center justify-center bg-gray-100 rounded-t-lg overflow-hidden ${(!headerMediaUrl || templateType !== "IMAGE") ? "h-32" : ""}`}>
                          {templateType === "IMAGE" && headerMediaUrl ? (
                            <img src={headerMediaUrl} alt="Header preview" className="w-full h-auto max-h-[400px] object-cover" />
                          ) : templateType === "IMAGE" ? (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          ) : null}
                          {templateType === "VIDEO" && <Video className="h-12 w-12 text-gray-400" />}
                          {templateType === "DOCUMENT" && <FileText className="h-12 w-12 text-gray-400" />}
                          {templateType === "LOCATION" && <MapPin className="h-12 w-12 text-gray-400" />}
                        </div>
                      )}
                      {templateType !== "TEXT" && templateType !== "IMAGE" && headerMediaUrl && (
                        <p className="text-xs text-gray-500 break-all">{headerMediaUrl}</p>
                      )}
                      <div className="text-gray-700 whitespace-pre-wrap text-sm">
                        {bodyText || "Your message will appear here..."}
                      </div>
                      {footerText && (
                        <div className="pt-2 text-xs text-gray-500 border-t">{footerText}</div>
                      )}
                      {buttonLayout === "QUICK_REPLY" && quickReplies.some((reply) => reply.trim()) && (
                        <div className="pt-2 grid gap-2 sm:grid-cols-3">
                          {quickReplies
                            .map((reply) => reply.trim())
                            .filter(Boolean)
                            .map((reply, idx) => (
                              <button
                                key={`${reply}-${idx}`}
                                className="w-full py-2 px-4 bg-white border border-gray-300 rounded text-sm font-medium text-blue-600 hover:bg-gray-50"
                              >
                                {reply}
                              </button>
                            ))}
                        </div>
                      )}
                      {buttonLayout === "CALL_TO_ACTION" && (
                        <div className="pt-2 grid gap-2 sm:grid-cols-2">
                          {ctaPhoneEnabled && ctaPhoneText.trim() && (
                            <button className="w-full py-2 px-4 bg-white border border-gray-300 rounded text-sm font-medium text-blue-600 hover:bg-gray-50">
                              {ctaPhoneText.trim()}
                            </button>
                          )}
                          {ctaWebsiteEnabled && ctaWebsiteText.trim() && (
                            <button className="w-full py-2 px-4 bg-white border border-gray-300 rounded text-sm font-medium text-blue-600 hover:bg-gray-50">
                              {ctaWebsiteText.trim()}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
