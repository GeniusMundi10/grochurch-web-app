"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Phone, 
  Settings2, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

// Hardcoded WhatsApp icon path from simple-icons
const WHATSAPP_ICON = {
  path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.551 4.2 1.6 6.052L0 24l6.102-1.6c1.785.973 3.805 1.49 5.94 1.491h.005c6.634 0 12.05-5.414 12.05-12.051 0-3.214-1.252-6.234-3.525-8.508z",
  hex: "25D366",
  title: "WhatsApp"
};

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatus(data.info || null);
    } catch {
      setStatus(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async () => {
    toast.promise(
      fetch("/api/whatsapp/templates/sync", { method: "POST" }),
      {
        loading: "Syncing templates...",
        success: "Templates synced successfully",
        error: "Failed to sync templates"
      }
    );
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp number?")) return;
    
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("WhatsApp disconnected");
        setStatus(null);
      } else {
        toast.error(data.error || "Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const BrandIcon = ({ icon, className = "h-5 w-5" }: { icon: { path: string; hex: string; title: string }, className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label={icon.title} xmlns="http://www.w3.org/2000/svg">
      <title>{icon.title}</title>
      <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" className="mb-4 pl-0 text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={() => router.push("/integrations")}>
            ← Back to Integrations
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
            WhatsApp Integration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-[15px]">
            Manage your connected phone number, AI behaviors, and message syncing.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Hero Credentials Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/40 dark:shadow-none brand-gradient rounded-3xl overflow-hidden relative group text-white">
            <div className="absolute inset-x-0 -top-24 -z-10 h-48 w-full rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
            
            {/* Subtle cross watermark */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
              <svg viewBox="0 0 100 120" className="w-[400px] h-[400px]" fill="white">
                <rect x="38" y="0" width="24" height="120" rx="4" />
                <rect x="10" y="28" width="80" height="24" rx="4" />
              </svg>
            </div>

            <CardContent className="p-8 sm:p-10 relative z-10">
              {status ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                  <div className="space-y-6 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-semibold tracking-wide backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      API Connected & Active
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">Display Phone Number</p>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/10 rounded-xl shadow-inner backdrop-blur-sm border border-white/5">
                          <Phone className="w-6 h-6 text-white/70" />
                        </div>
                        <h2 className="text-4xl font-light tracking-tight font-mono text-white">
                          {status.phone_number || "Verified"}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* AI Agent Assignment block */}
                  <div className="w-full md:w-auto p-6 bg-white/5 rounded-2xl border border-white/10 shrink-0 backdrop-blur-sm">
                     <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400 mb-3 block">Handling Responses</p>
                     <div className="flex items-center gap-3">
                        <div className="p-4 bg-orange-500 rounded-xl shadow-sm border border-orange-400/50">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{status.ai_name || "Primary AI"}</p>
                          <p className="text-xs text-white/60">Autonomous Agent</p>
                        </div>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="p-5 bg-white/10 rounded-full backdrop-blur-sm border border-white/5">
                    <AlertCircle className="w-12 h-12 text-white/50" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="font-bold text-xl text-white">No Connection</h3>
                    <p className="text-sm text-white/60 mt-2">
                      You haven't connected a WhatsApp number yet. Go back to Integrations to get started.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            
            {status && (
              <div className="bg-black/20 border-t border-white/10 p-4 px-8 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
                  <ShieldCheck className="w-4 h-4 text-white/40" />
                  <span>WABA ID: {status.waba_id}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchStatus} className="text-white/70 hover:text-white hover:bg-white/10">
                    <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Refresh
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Disconnect
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Configuration Grid */}
          {status && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Settings2 className="w-4 h-4 text-blue-500" />
                    Templates & Assets
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pull the latest approved templates from Meta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border-0 shadow-none" onClick={handleSync}>
                    <RefreshCcw className="w-4 h-4 mr-2" /> Sync Meta Templates
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    System Webhooks
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time connection to GroChurch servers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Listening for inbound messages</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
