"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import {
  Bot,
  Church,
  Globe,
  Mail,
  Phone,
  Calendar,
  Save,
  Loader2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { triggerVectorstoreCreation } from "@/lib/vectorstore";
import { COMMON_TIMEZONES, getBrowserTimezone } from "@/lib/timezones";

export default function AIAssistantPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [config, setConfig] = useState({
    id: "",
    ai_name: "",
    agent_type: "support-hero",
    company_name: "",
    website: "",
    email: "",
    phone_number: "",
    calendar_link: "",
    timezone: getBrowserTimezone(),
    vectorstore_ready: false,
    session_cookie: ""
  });

  const [initialWebsite, setInitialWebsite] = useState("");

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("business_info")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setConfig({
          id: data.id,
          ai_name: data.ai_name || "",
          agent_type: data.agent_type || "support-hero",
          company_name: data.company_name || "",
          website: data.website || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          calendar_link: data.calendar_link || "",
          timezone: data.timezone || getBrowserTimezone(),
          vectorstore_ready: data.vectorstore_ready || false,
          session_cookie: data.session_cookie || ""
        });
        setInitialWebsite(data.website || "");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load AI configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!config.ai_name.trim() || !config.company_name.trim()) {
        toast.error("Assistant Name and Church Name are required.");
        setSaving(false);
        return;
      }

      const isNew = !config.id;
      let websiteChanged = config.website !== initialWebsite;
      let payload = {
        user_id: user?.id,
        ai_name: config.ai_name,
        agent_type: config.agent_type,
        company_name: config.company_name,
        website: config.website,
        email: config.email,
        phone_number: config.phone_number,
        calendar_link: config.calendar_link,
        timezone: config.timezone,
        vectorstore_ready: websiteChanged && config.website ? false : config.vectorstore_ready
      };

      let currentId = config.id;
      let sessionCookie = config.session_cookie;

      if (isNew) {
        const { data, error } = await supabase
          .from("business_info")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        currentId = data.id;
        sessionCookie = data.session_cookie;
        setConfig((prev) => ({ ...prev, id: currentId, session_cookie: sessionCookie, vectorstore_ready: payload.vectorstore_ready }));
        setInitialWebsite(config.website);
      } else {
        const { error } = await supabase
          .from("business_info")
          .update(payload)
          .eq("id", currentId);
        if (error) throw error;
      }

      toast.success("Settings saved successfully!");

      // If new website or website changed, auto-trigger knowledge base sync
      if (config.website && (isNew || websiteChanged)) {
        handleSync(currentId, sessionCookie);
      }

      setInitialWebsite(config.website);
    } catch (e: any) {
      console.error(e);
      toast.error("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (targetId = config.id, targetCookie = config.session_cookie) => {
    if (!config.website) {
      toast.error("Please provide a Church Website URL first.");
      return;
    }
    setSyncing(true);
    toast.info("Knowledge Base sync started. This may take a few minutes.");
    try {
      const res = await triggerVectorstoreCreation(targetId, targetCookie);
      if (res.success) {
        toast.success("Sync successfully initiated!");
      } else {
        toast.error("Sync failed: " + res.message);
      }
    } catch (e) {
      toast.error("Error triggering sync.");
    } finally {
      setSyncing(false);
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bot className="w-8 h-8 text-orange-600" />
          Ministry Assistant
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Configure your church's AI assistant to answer questions, guide visitors, and provide spiritual support.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Assistant Persona Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Assistant Persona</h2>
              <p className="text-sm text-gray-500">How the AI introduces itself and interacts.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Assistant Name</label>
              <input
                type="text"
                value={config.ai_name}
                onChange={(e) => handleChange("ai_name", e.target.value)}
                placeholder="e.g., GraceBot"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Interaction Style</label>
              <div className="grid grid-cols-1 gap-3">
                <label className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${config.agent_type === 'support-hero' ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="agent_type" value="support-hero" checked={config.agent_type === 'support-hero'} onChange={(e) => handleChange("agent_type", e.target.value)} className="sr-only" />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-semibold ${config.agent_type === 'support-hero' ? 'text-orange-900' : 'text-gray-900'}`}>Counseling & Support (Recommended)</span>
                    <span className={`block mt-1 text-sm ${config.agent_type === 'support-hero' ? 'text-orange-700' : 'text-gray-500'}`}>Highly empathetic, patient, and focuses on listening and providing emotional/spiritual care.</span>
                  </div>
                </label>
                
                <label className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${config.agent_type === 'lead-magnet' ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="agent_type" value="lead-magnet" checked={config.agent_type === 'lead-magnet'} onChange={(e) => handleChange("agent_type", e.target.value)} className="sr-only" />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-semibold ${config.agent_type === 'lead-magnet' ? 'text-orange-900' : 'text-gray-900'}`}>Visitor Welcoming</span>
                    <span className={`block mt-1 text-sm ${config.agent_type === 'lead-magnet' ? 'text-orange-700' : 'text-gray-500'}`}>Proactive and friendly. Focuses on gathering visitor information to connect them with a human pastor.</span>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${config.agent_type === 'educator' ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="agent_type" value="educator" checked={config.agent_type === 'educator'} onChange={(e) => handleChange("agent_type", e.target.value)} className="sr-only" />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-semibold ${config.agent_type === 'educator' ? 'text-orange-900' : 'text-gray-900'}`}>Teaching & Education</span>
                    <span className={`block mt-1 text-sm ${config.agent_type === 'educator' ? 'text-orange-700' : 'text-gray-500'}`}>Logical and clear. Best for answering questions about theology, doctrine, or church history.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Church Knowledge Base Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Church className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Church Knowledge & Details</h2>
              <p className="text-sm text-gray-500">What the AI knows about your ministry.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Church Name</label>
              <input
                type="text"
                value={config.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="e.g., First Grace Church"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex justify-between">
                <span>Church Website URL</span>
                {config.website && (
                  <button onClick={() => handleSync()} disabled={syncing || !config.id} className="text-blue-600 flex items-center text-xs hover:underline disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Knowledge
                  </button>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={config.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://yourchurch.com"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <p className="text-xs text-gray-500">The AI will read this website to learn everything about your church's beliefs and schedules.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Church Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={config.phone_number}
                    onChange={(e) => handleChange("phone_number", e.target.value)}
                    placeholder="+1234567890"
                    className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Church Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={config.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="hello@church.com"
                    className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Pastor's Meeting Link (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={config.calendar_link}
                  onChange={(e) => handleChange("calendar_link", e.target.value)}
                  placeholder="Calendly link or scheduling page"
                  className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

             <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Church Timezone</label>
              <select
                value={config.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              >
                 {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
              </select>
            </div>

          </div>
        </div>

      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Assistant Settings
        </button>
      </div>

    </div>
  );
}
