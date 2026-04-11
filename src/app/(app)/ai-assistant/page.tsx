"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Church, Globe, Mail, Phone, Calendar, Save, Loader2,
  RefreshCw, Sparkles, MessageCircle, FileText, Upload,
  Trash2, Heart, BookOpen, Mic, ArrowRight, ArrowLeft, CheckCircle2
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

const STEPS = [
  { id: "persona", label: "Assistant Persona", icon: Bot },
  { id: "voice", label: "Pastor's Voice", icon: Mic },
  { id: "details", label: "Church Details", icon: Church },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
];

export default function AIAssistantPage() {
  const { user } = useUser();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);

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
      const { data: biz } = await supabase
        .from("business_info").select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      if (biz) {
        setConfig({
          id: biz.id, ai_name: biz.ai_name || "", agent_type: biz.agent_type || "support-hero",
          company_name: biz.business_name || "", website: biz.website || "",
          email: biz.email || "", phone_number: biz.phone_number || "",
          calendar_link: biz.calendar_link || "", timezone: biz.timezone || getBrowserTimezone(),
          vectorstore_ready: biz.vectorstore_ready || false,
          session_cookie: biz.session_cookie || "",
          extra_instructions: biz.extra_instructions || "",
        });
        setInitialWebsite(biz.website || "");

        const greetingData = await getFirstGreeting(biz.id);
        if (greetingData) setGreeting(greetingData.message || "");

        const svcData = await getAIServices(biz.id, user!.id);
        if (svcData) setServices({
          business_services: svcData.business_services || "",
          differentiation: svcData.differentiation || "",
          profitable_line_items: svcData.profitable_line_items || "",
          best_sales_lines: svcData.best_sales_lines || "",
        });

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

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      if (!config.ai_name.trim() || !config.company_name.trim()) {
        if (!silent) toast.error("Assistant Name and Church Name are required.");
        if (!config.ai_name.trim()) setCurrentStep(0);
        else if (!config.company_name.trim()) setCurrentStep(2);
        setSaving(false); return false;
      }

      const isNew = !config.id;
      const websiteChanged = config.website !== initialWebsite;
      const bizPayload: any = {
        user_id: user?.id, ai_name: config.ai_name,
        agent_type: config.agent_type, business_name: config.company_name,
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

      if (greeting.trim()) await upsertFirstGreeting(currentId, user!.id, greeting);
      await upsertAIServices(currentId, user!.id, services);

      if (!silent) toast.success("All settings saved successfully!");

      if (config.website && (isNew || websiteChanged)) {
        handleSync(currentId, sessionCookie);
      }
      setInitialWebsite(config.website);
      return true;
    } catch (e: any) {
      console.error(e);
      if (!silent) toast.error("Error saving settings.");
      return false;
    } finally { setSaving(false); }
  };

  const handleNext = async () => {
    // Optionally auto-save softly between steps
    if (currentStep === 0 && !config.ai_name.trim()) {
      toast.error("Please name your AI Assistant to continue.");
      return;
    }
    if (currentStep === 2 && !config.company_name.trim()) {
      toast.error("Please enter your Church Name to continue.");
      return;
    }
    
    // Auto-save quietly if enough basic info exists
    if (config.ai_name.trim() && config.company_name.trim()) {
      await handleSave(true);
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      await handleSave(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
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

  const handleFileUpload = async (fileList: FileList) => {
    if (!config.id || !user?.id) { 
      toast.error("Please save your church details first before uploading."); 
      return; 
    }
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
      <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-gray-500 font-medium animate-pulse">Waking up your AI...</p>
      </div>
    );
  }

  const slideVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 pt-6">
      {/* Wizard Header */}
      <div className="mb-10 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl mx-auto shadow-xl shadow-orange-500/20 flex items-center justify-center mb-6"
        >
          <Bot className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Ministry AI Assistant
        </h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">
          Teach your AI to speak, think, and respond just like you. Let's configure your digital pastoral companion.
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center gap-2">
          {STEPS.map((stepInfo, idx) => (
            <div key={idx} className="flex items-center">
              <div 
                className={`flex flex-col items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 ${
                  currentStep === idx 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30 scale-110" 
                    : currentStep > idx 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {currentStep > idx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-1 w-12 sm:w-20 mx-1 rounded-full transition-all duration-500 ${
                  currentStep > idx ? "bg-green-500" : "bg-gray-100"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Animated Form Area */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 sm:p-10 min-h-[400px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* STEP 0: PERSONA */}
            {currentStep === 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="p-3 bg-orange-50 rounded-2xl"><Sparkles className="w-6 h-6 text-orange-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Let's build a Persona</h2>
                    <p className="text-gray-500">How should visitors address your AI?</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Give your Assistant a Name</label>
                  <input type="text" value={config.ai_name} onChange={(e) => handleChange("ai_name", e.target.value)}
                    placeholder="e.g., GraceBot, Pastor's Helper"
                    className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 mt-6">Interaction Paradigm</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: "support-hero", title: "Counseling & Care (Recommended)", desc: "Empathetic, patient listener." },
                      { value: "lead-magnet", title: "Welcoming & Greeting", desc: "Proactive, fun, gets visitor details." },
                      { value: "educator", title: "Teaching & Theology", desc: "Logical, quotes scripture accurately." },
                      { value: "advisor", title: "Spiritual Guidance", desc: "Consultative and trustworthy." },
                    ].map((style) => (
                      <label key={style.value} className={`relative flex cursor-pointer rounded-2xl border-2 p-5 transition-all ${config.agent_type === style.value ? "border-orange-500 bg-orange-50 shadow-md transform scale-[1.02]" : "border-gray-100 hover:border-orange-200"}`}>
                        <input type="radio" name="agent_type" value={style.value} checked={config.agent_type === style.value} onChange={(e) => handleChange("agent_type", e.target.value)} className="sr-only" />
                        <div className="flex flex-col">
                          <span className={`block text-base font-bold mb-1 ${config.agent_type === style.value ? "text-orange-900" : "text-gray-900"}`}>{style.title}</span>
                          <span className={`block text-sm ${config.agent_type === style.value ? "text-orange-700" : "text-gray-500"}`}>{style.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: VOICE */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="p-3 bg-red-50 rounded-2xl"><Heart className="w-6 h-6 text-red-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">The Pastor's Heart</h2>
                    <p className="text-gray-500">Train the AI to sound authentically like you.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-orange-500" /> The First Impression (Welcome Message)
                  </label>
                  <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)}
                    placeholder="e.g., Welcome to First Grace Church! 🙏 How can I help you today?"
                    rows={2}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 mt-4">
                  {[
                    { field: "business_services", title: "What do you offer?", placeholder: "Sunday worship at 9am, Wednesday Bible study..." },
                    { field: "best_sales_lines", title: "Favorite Expressions / Verses", placeholder: "e.g., 'God has a plan for your life', Jeremiah 29:11..." },
                    { field: "extra_instructions", title: "Strict AI Rules", placeholder: "e.g., Never discuss politics. Share the prayer hotline: 555-1234.", isConfig: true },
                  ].map((item) => (
                    <div key={item.field} className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">{item.title}</label>
                      <textarea
                        value={item.isConfig ? config.extra_instructions : (services as any)[item.field]}
                        onChange={(e) => {
                          if (item.isConfig) handleChange("extra_instructions", e.target.value);
                          else setServices((prev) => ({ ...prev, [item.field]: e.target.value }));
                        }}
                        placeholder={item.placeholder}
                        rows={2}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: DETAILS */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="p-3 bg-blue-50 rounded-2xl"><Church className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Church Details</h2>
                    <p className="text-gray-500">Contact mapping and website crawling.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-gray-700">Church Name (Required)</label>
                  <input type="text" value={config.company_name} onChange={(e) => handleChange("company_name", e.target.value)}
                    placeholder="e.g., First Grace Church"
                    className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-lg"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-gray-700">Official Website URL</label>
                    {config.website && (
                      <button onClick={() => handleSync()} disabled={syncing || !config.id} className="text-blue-600 font-medium text-xs flex items-center hover:underline bg-blue-50 px-3 py-1 rounded-full">
                        <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync AI with Site
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Globe className="h-5 w-5 text-gray-400" /></div>
                    <input type="url" value={config.website} onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="https://yourchurch.com"
                      className="w-full h-14 pl-12 pr-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Phone</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div>
                      <input type="tel" value={config.phone_number} onChange={(e) => handleChange("phone_number", e.target.value)}
                        placeholder="+1234567890" className="w-full h-14 pl-12 pr-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                      <input type="email" value={config.email} onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="pastor@church.com" className="w-full h-14 pl-12 pr-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: KNOWLEDGE BASE */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="p-3 bg-purple-50 rounded-2xl"><BookOpen className="w-6 h-6 text-purple-600" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Upload Intelligence</h2>
                    <p className="text-gray-500">Provide sermons, guides, and schedules.</p>
                  </div>
                </div>

                <div
                  className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    uploading ? "border-purple-500 bg-purple-50/50" : "border-gray-200 hover:border-purple-400 hover:bg-purple-50/20 bg-gray-50"
                  }`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); if (!uploading) handleFileUpload(e.dataTransfer.files); }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className={`p-5 rounded-full mb-4 shadow-sm ${uploading ? "bg-purple-100" : "bg-white border border-gray-100"}`}>
                    {uploading ? <Loader2 className="w-8 h-8 text-purple-600 animate-spin" /> : <Upload className="w-8 h-8 text-purple-500" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {uploading ? "Absorbing documents..." : "Click or drag to drop files"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2">Upload any PDF, CSV, or Text file.</p>
                  <input ref={fileInputRef} type="file" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); }}
                    accept=".doc,.docx,.txt,.xls,.xlsx,.pdf,.csv,.md,.rtf,.ppt,.pptx,.json"
                    disabled={uploading}
                  />
                </div>

                {files.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-gray-700">Memory Bank</h3>
                      <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">{files.length} Files</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 rounded-lg"><FileText className="w-5 h-5 text-gray-600" /></div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{file.file_name}</p>
                              <p className="text-xs text-gray-400">{file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : "—"}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteFile(file)} disabled={uploading}
                            className="text-gray-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="mt-8 flex items-center justify-between">
        <button 
          onClick={handlePrev}
          disabled={currentStep === 0 || saving}
          className={`flex items-center gap-2 px-6 h-12 rounded-xl font-semibold transition-all ${
            currentStep === 0 ? "opacity-0 pointer-events-none" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <button 
          onClick={handleNext} 
          disabled={saving}
          className="flex items-center gap-2 px-8 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : currentStep === STEPS.length - 1 ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          {currentStep === STEPS.length - 1 ? "Complete Setup" : "Next Step"}
        </button>
      </div>
    </div>
  );
}
