"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import {
  Bot, Church, Globe, Mail, Phone, Calendar, Save, Loader2,
  RefreshCw, Sparkles, MessageCircle, FileText, Upload,
  Trash2, Heart, BookOpen, Mic
} from "lucide-react";
import { triggerVectorstoreCreation } from "@/lib/vectorstore";
import { COMMON_TIMEZONES, getBrowserTimezone } from "@/lib/timezones";
import {
  getAIServices, upsertAIServices,
  getFirstGreeting, upsertFirstGreeting,
  getAIFiles, uploadAIFileToStorage, upsertAIFile, deleteAIFile,
  processFilesWithWorker, removeFilesFromWorker,
  type AIFile
} from "@/lib/supabase-helpers";

const TABS = [
  { id: "persona", label: "Persona", icon: Bot },
  { id: "voice", label: "Pastor's Voice", icon: Mic },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "details", label: "Church Details", icon: Church },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AIAssistantPage() {
  const { user } = useUser();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("persona");

  // Business Info
  const [config, setConfig] = useState({
    id: "", ai_name: "", agent_type: "support-hero",
    company_name: "", website: "", email: "",
    phone_number: "", calendar_link: "",
    timezone: getBrowserTimezone(),
    vectorstore_ready: false, session_cookie: "",
    extra_instructions: "",
  });
  const [initialWebsite, setInitialWebsite] = useState("");

  // Greeting
  const [greeting, setGreeting] = useState("");

  // Services (Pastor's Voice)
  const [services, setServices] = useState({
    business_services: "", differentiation: "",
    profitable_line_items: "", best_sales_lines: "",
  });

  // Files (Knowledge Base)
  const [files, setFiles] = useState<AIFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. Business Info
      const { data: biz } = await supabase
        .from("business_info").select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      if (biz) {
        setConfig({
          id: biz.id, ai_name: biz.ai_name || "", agent_type: biz.agent_type || "support-hero",
          company_name: biz.company_name || "", website: biz.website || "",
          email: biz.email || "", phone_number: biz.phone_number || "",
          calendar_link: biz.calendar_link || "", timezone: biz.timezone || getBrowserTimezone(),
          vectorstore_ready: biz.vectorstore_ready || false,
          session_cookie: biz.session_cookie || "",
          extra_instructions: biz.extra_instructions || "",
        });
        setInitialWebsite(biz.website || "");

        // 2. Greeting
        const greetingData = await getFirstGreeting(biz.id);
        if (greetingData) setGreeting(greetingData.message || "");

        // 3. Services
        const svcData = await getAIServices(biz.id, user!.id);
        if (svcData) setServices({
          business_services: svcData.business_services || "",
          differentiation: svcData.differentiation || "",
          profitable_line_items: svcData.profitable_line_items || "",
          best_sales_lines: svcData.best_sales_lines || "",
        });

        // 4. Files
        const filesData = await getAIFiles(biz.id);
        setFiles(filesData);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load settings.");
    } finally { setLoading(false); }
  };

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!config.ai_name.trim() || !config.company_name.trim()) {
        toast.error("Assistant Name and Church Name are required.");
        setSaving(false); return;
      }

      const isNew = !config.id;
      const websiteChanged = config.website !== initialWebsite;
      const bizPayload: any = {
        user_id: user?.id, ai_name: config.ai_name,
        agent_type: config.agent_type, company_name: config.company_name,
        website: config.website, email: config.email,
        phone_number: config.phone_number, calendar_link: config.calendar_link,
        timezone: config.timezone, extra_instructions: config.extra_instructions,
        vectorstore_ready: websiteChanged && config.website ? false : config.vectorstore_ready,
      };

      let currentId = config.id;
      let sessionCookie = config.session_cookie;

      if (isNew) {
        const { data, error } = await supabase.from("business_info").insert([bizPayload]).select().single();
        if (error) throw error;
        currentId = data.id; sessionCookie = data.session_cookie;
        setConfig((prev) => ({ ...prev, id: currentId, session_cookie: sessionCookie }));
      } else {
        const { error } = await supabase.from("business_info").update(bizPayload).eq("id", currentId);
        if (error) throw error;
      }

      // Save greeting
      if (greeting.trim()) {
        await upsertFirstGreeting(currentId, user!.id, greeting);
      }

      // Save services
      await upsertAIServices(currentId, user!.id, services);

      toast.success("All settings saved!");

      if (config.website && (isNew || websiteChanged)) {
        handleSync(currentId, sessionCookie);
      }
      setInitialWebsite(config.website);
    } catch (e: any) {
      console.error(e);
      toast.error("Error saving settings.");
    } finally { setSaving(false); }
  };

  const handleSync = async (targetId = config.id, targetCookie = config.session_cookie) => {
    if (!config.website) { toast.error("Please provide a Church Website URL first."); return; }
    setSyncing(true);
    toast.info("Knowledge Base sync started...");
    try {
      const res = await triggerVectorstoreCreation(targetId, targetCookie);
      if (res.success) toast.success("Sync initiated!");
      else toast.error("Sync failed: " + res.message);
    } catch { toast.error("Error triggering sync."); }
    finally { setSyncing(false); }
  };

  // File Upload
  const handleFileUpload = async (fileList: FileList) => {
    if (!config.id || !user?.id) { toast.error("Please save basic settings first."); return; }
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      toast.info(`Uploading ${file.name}...`);
      const uploadResult = await uploadAIFileToStorage(config.id, file);
      if (!uploadResult) { toast.error(`Failed to upload ${file.name}`); continue; }

      const dbResult = await upsertAIFile(config.id, user.id, {
        url: uploadResult.url, file_path: uploadResult.file_path,
        file_name: file.name, file_type: file.type, file_size: file.size,
      });
      if (dbResult) { uploadedUrls.push(uploadResult.url); }
    }

    if (uploadedUrls.length > 0) {
      toast.info("Processing documents for your AI...");
      const res = await processFilesWithWorker(config.id, uploadedUrls);
      if (res.success) toast.success(`${uploadedUrls.length} document(s) added to Knowledge Base!`);
      else toast.error("Processing failed. Documents may not be searchable yet.");
    }

    setFiles(await getAIFiles(config.id));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (file: AIFile) => {
    const ok = await deleteAIFile(file.id, file.file_path);
    if (!ok) { toast.error("Failed to delete file."); return; }
    await removeFilesFromWorker(config.id, [file.url]);
    toast.success("Document removed.");
    setFiles(await getAIFiles(config.id));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bot className="w-8 h-8 text-orange-600" />
          Ministry Assistant
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Teach your AI to speak, think, and respond just like you. The more you share, the better it represents your ministry.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================== TAB 1: PERSONA =================== */}
      {activeTab === "persona" && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 rounded-xl"><Sparkles className="w-5 h-5 text-orange-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assistant Persona</h2>
                <p className="text-sm text-gray-500">How the AI introduces itself and interacts with visitors.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Assistant Name</label>
              <input type="text" value={config.ai_name} onChange={(e) => handleChange("ai_name", e.target.value)}
                placeholder="e.g., GraceBot, Pastor's Helper"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Interaction Style</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: "support-hero", title: "Counseling & Support (Recommended)", desc: "Highly empathetic, patient, and focuses on listening and providing emotional/spiritual care." },
                  { value: "lead-magnet", title: "Visitor Welcoming", desc: "Proactive and friendly. Focuses on gathering visitor information to connect them with a human pastor." },
                  { value: "educator", title: "Teaching & Education", desc: "Logical and clear. Best for answering questions about theology, doctrine, or church history." },
                  { value: "advisor", title: "Spiritual Guidance", desc: "Wise and consultative. Provides strategic, thoughtful advice and builds deep trust." },
                ].map((style) => (
                  <label key={style.value} className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${config.agent_type === style.value ? "border-orange-500 bg-orange-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="agent_type" value={style.value} checked={config.agent_type === style.value} onChange={(e) => handleChange("agent_type", e.target.value)} className="sr-only" />
                    <div className="flex flex-col">
                      <span className={`block text-sm font-semibold ${config.agent_type === style.value ? "text-orange-900" : "text-gray-900"}`}>{style.title}</span>
                      <span className={`block mt-1 text-sm ${config.agent_type === style.value ? "text-orange-700" : "text-gray-500"}`}>{style.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-orange-500" />
                Welcome Message
              </label>
              <p className="text-xs text-gray-500">The first thing visitors see when they message your church.</p>
              <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)}
                placeholder="e.g., Welcome to First Grace Church! 🙏 How can I help you today? Whether you have questions about our services, need prayer, or want to visit, I'm here for you."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================== TAB 2: PASTOR'S VOICE =================== */}
      {activeTab === "voice" && (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex gap-4">
            <Heart className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">This is the heart of your AI clone</h3>
              <p className="text-sm text-orange-800 mt-1">The more you write here, the more the AI will sound like <strong>you</strong>. Think of this as teaching a new ministry volunteer everything they need to know.</p>
            </div>
          </div>

          {[
            { field: "business_services", title: "Describe Your Ministry", desc: "What does your church do? What programs, services, or activities do you offer?", placeholder: "e.g., We're a non-denominational church focused on community outreach. We offer Sunday worship at 9am & 11am, Wednesday Bible study, youth group on Fridays, and a monthly community meal program..." },
            { field: "differentiation", title: "What Makes Your Church Special?", desc: "What would you tell someone who asked why they should visit your church?", placeholder: "e.g., We're a welcoming, come-as-you-are church. Our pastor has 20 years of experience. We have a thriving children's ministry and a strong focus on real community..." },
            { field: "best_sales_lines", title: "Key Phrases You Always Use", desc: "What are the phrases, Bible verses, or sayings you find yourself repeating?", placeholder: "e.g., 'God has a plan for your life', 'You're always welcome here', 'We believe in grace, not perfection', Jeremiah 29:11..." },
            { field: "extra_instructions", title: "Special Instructions for Your Assistant", desc: "Any specific rules or behaviors you want the AI to follow.", placeholder: "e.g., Always include a Bible verse when offering comfort. Never discuss politics. If someone mentions they are in crisis, immediately share our prayer hotline: (555) 123-4567. Always invite people to Sunday service.", isConfig: true },
          ].map((item) => (
            <div key={item.field} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{item.desc}</p>
              <textarea
                value={item.isConfig ? config.extra_instructions : (services as any)[item.field]}
                onChange={(e) => {
                  if (item.isConfig) handleChange("extra_instructions", e.target.value);
                  else setServices((prev) => ({ ...prev, [item.field]: e.target.value }));
                }}
                placeholder={item.placeholder}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none text-sm leading-relaxed"
              />
            </div>
          ))}
        </div>
      )}

      {/* =================== TAB 3: KNOWLEDGE BASE =================== */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
            <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Upload Documents to Train Your AI</h3>
              <p className="text-sm text-blue-800 mt-1">Upload sermons, belief statements, FAQ sheets, event schedules, or any document you want the AI to know. It will read and understand these to answer questions accurately.</p>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              uploading ? "border-orange-500 bg-orange-50/50" : "border-gray-300 hover:border-orange-400 hover:bg-orange-50/30 bg-white"
            }`}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); if (!uploading) handleFileUpload(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${uploading ? "bg-orange-100" : "bg-gray-100"}`}>
                {uploading ? <Loader2 className="w-8 h-8 text-orange-600 animate-spin" /> : <Upload className="w-8 h-8 text-gray-500" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  {uploading ? "Processing documents..." : "Click or drag files to upload"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">PDF, DOC, TXT, CSV, XLS (Max 10MB each)</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); }}
              accept=".doc,.docx,.txt,.xls,.xlsx,.pdf,.csv,.md,.rtf,.ppt,.pptx,.json"
              disabled={uploading}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Uploaded Documents
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{files.length}</span>
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                        <p className="text-xs text-gray-500">{file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "—"}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteFile(file)} disabled={uploading}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && !uploading && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No documents uploaded yet.</p>
              <p className="text-sm text-gray-400 mt-1">Upload sermons, beliefs, FAQs, or any church document.</p>
            </div>
          )}
        </div>
      )}

      {/* =================== TAB 4: CHURCH DETAILS =================== */}
      {activeTab === "details" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm"><Church className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Church Knowledge & Details</h2>
              <p className="text-sm text-gray-500">Contact info and website that the AI uses to help visitors.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Church Name</label>
              <input type="text" value={config.company_name} onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="e.g., First Grace Church"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex justify-between">
                <span>Church Website URL</span>
                {config.website && (
                  <button onClick={() => handleSync()} disabled={syncing || !config.id} className="text-blue-600 flex items-center text-xs hover:underline disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync Knowledge
                  </button>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Globe className="h-5 w-5 text-gray-400" /></div>
                <input type="url" value={config.website} onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://yourchurch.com"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-gray-500">The AI will read this website to learn about your church's beliefs and schedules.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Church Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-gray-400" /></div>
                  <input type="tel" value={config.phone_number} onChange={(e) => handleChange("phone_number", e.target.value)}
                    placeholder="+1234567890" className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Church Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-gray-400" /></div>
                  <input type="email" value={config.email} onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="hello@church.com" className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Pastor's Meeting Link (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <input type="url" value={config.calendar_link} onChange={(e) => handleChange("calendar_link", e.target.value)}
                  placeholder="Calendly link or scheduling page"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Church Timezone</label>
              <select value={config.timezone} onChange={(e) => handleChange("timezone", e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm">
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-8 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save All Settings
        </button>
      </div>
    </div>
  );
}
