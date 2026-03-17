"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Settings,
  Loader2,
  Zap,
  Info,
  Phone,
  LogOut,
  ExternalLink,
} from "lucide-react";

// Hardcoded WhatsApp icon path from simple-icons
const WHATSAPP_ICON = {
  path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.414 0 12.05c0 2.123.551 4.2 1.6 6.052L0 24l6.102-1.6c1.785.973 3.805 1.49 5.94 1.491h.005c6.634 0 12.05-5.414 12.05-12.051 0-3.214-1.252-6.234-3.525-8.508z",
  hex: "25D366",
  title: "WhatsApp"
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// WhatsApp OAuth redirect URI (Constructed dynamically)
const getRedirectUri = () => {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  // Fallback override if needed via env
  const override = process.env.NEXT_PUBLIC_WA_REDIRECT_URI;
  if (override) return override;
  
  // Construct the secure redirect path
  return `${origin}/wa-es-redirect`;
};

export default function IntegrationsForm() {
  const { user } = useUser();
  const router = useRouter();
  const [whatsappConnected, setWhatsappConnected] = useState<boolean>(false);
  const [whatsappInfo, setWhatsappInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);
  const fbReadyRef = useRef(false);
  const waSessionDataRef = useRef<{ waba_id?: string; phone_number_id?: string } | null>(null);
  const processingCodeRef = useRef(false);

  // Official brand icons using simple-icons
  const BrandIcon = ({ icon, className = "h-5 w-5" }: { icon: { path: string; hex: string; title: string }, className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-label={icon.title} xmlns="http://www.w3.org/2000/svg">
      <title>{icon.title}</title>
      <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
  );

  // Load connection status from backend
  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/whatsapp/status");
        const data = await res.json();
        setWhatsappConnected(!!data.connected);
        setWhatsappInfo(data.info || null);
      } catch {
        setWhatsappConnected(false);
        setWhatsappInfo(null);
      }
      setLoading(false);
    };
    checkStatus();
  }, []);

  // ---- WhatsApp Embedded Signup helpers ----
  const loadFacebookSdk = () => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (w.FB) {
      fbReadyRef.current = true;
      return;
    }
    
    w.fbAsyncInit = function () {
      const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
      w.FB?.init({
        appId: appId || "",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      fbReadyRef.current = true;
    };

    const id = "facebook-jssdk";
    if (!document.getElementById(id)) {
      const js = document.createElement("script");
      js.id = id;
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(js);
    }

    if (!w.__wa_es_listener_added) {
      window.addEventListener("message", (event: MessageEvent) => {
        if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return;
        let payload: any = null;
        try {
          const raw = (event as any).data;
          payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          payload = null;
        }
        if (payload?.type === "WA_EMBEDDED_SIGNUP") {
          waSessionDataRef.current = {
            waba_id: payload?.data?.waba_id,
            phone_number_id: payload?.data?.phone_number_id,
          };
        }
      });
      w.__wa_es_listener_added = true;
    }
  };

  useEffect(() => {
    loadFacebookSdk();
  }, []);

  const handleConnectWhatsApp = async () => {
    if (whatsappConnecting) return;
    
    try {
      setWhatsappConnecting(true);
      const w = window as any;
      const FB = w.FB;
      if (!FB) {
        toast.error("Facebook SDK not loaded yet.");
        setWhatsappConnecting(false);
        return;
      }
      const configId = process.env.NEXT_PUBLIC_FB_EMBEDDED_SIGNUP_CONFIG_ID;
      if (!configId) {
        toast.error("WhatsApp Integration is not configured in environment variables.");
        setWhatsappConnecting(false);
        return;
      }

      function fbLoginCallback(response: any) {
        if (response?.authResponse?.code) {
          if (processingCodeRef.current) return;
          processingCodeRef.current = true;
          
          const body = {
            code: response.authResponse.code,
            waba_id: waSessionDataRef.current?.waba_id,
            phone_number_id: waSessionDataRef.current?.phone_number_id,
            redirect_uri: getRedirectUri(),
          };

          fetch("/api/whatsapp/embedded-callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
            .then(async (resp) => {
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok || !data?.success) {
                toast.error(data?.error || "WhatsApp onboarding failed");
                return;
              }
              setWhatsappConnected(true);
              toast.success("WhatsApp connected!");
              const s = await fetch("/api/whatsapp/status").then(r => r.json());
              setWhatsappConnected(!!s.connected);
              setWhatsappInfo(s.info || null);
            })
            .catch(() => {
              toast.error("Backend error during WhatsApp onboarding");
            })
            .finally(() => {
              processingCodeRef.current = false;
              setWhatsappConnecting(false);
            });
        } else {
          toast.error("WhatsApp signup was cancelled.");
          setWhatsappConnecting(false);
        }
      }

      FB.login(fbLoginCallback, {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        redirect_uri: getRedirectUri(),
        extras: { setup: {}, sessionInfoVersion: "3" },
      });
    } catch (e) {
      toast.error("Unable to initiate WhatsApp connection");
      setWhatsappConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWhatsappConnected(false);
        setWhatsappInfo(null);
        toast.success("WhatsApp disconnected");
      } else {
        toast.error(data.error || "Failed to disconnect WhatsApp");
      }
    } catch {
      toast.error("Failed to disconnect WhatsApp");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1].map((i) => (
          <Card key={i} className="animate-pulse shadow-sm border-gray-100 rounded-2xl overflow-hidden">
            <CardHeader className="h-40 bg-gray-50 dark:bg-slate-800/50" />
            <CardContent className="h-28" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className={cn(
          "overflow-hidden rounded-3xl transition-all duration-300 relative group brand-gradient text-white border-0",
          whatsappConnected 
            ? "shadow-xl shadow-orange-500/10" 
            : "hover:shadow-2xl hover:shadow-orange-500/20 opacity-90 hover:opacity-100"
        )}>
          {/* subtle background glow */}
          {whatsappConnected && (
            <div className="absolute inset-x-0 -top-24 -z-10 h-48 w-full rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
          )}

          {/* Subtle cross watermark */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
            <svg viewBox="0 0 100 120" className="w-[300px] h-[300px]" fill="white">
              <rect x="38" y="0" width="24" height="120" rx="4" />
              <rect x="10" y="28" width="80" height="24" rx="4" />
            </svg>
          </div>

          <CardHeader className="relative p-7 pb-5 z-10">
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "p-3.5 shadow-sm rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300",
                whatsappConnected 
                  ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white" 
                  : "bg-white/10 border border-white/20 backdrop-blur-sm"
              )}>
                <BrandIcon icon={WHATSAPP_ICON} className={cn("w-7 h-7", whatsappConnected ? "fill-white" : "")} />
              </div>
              
              {whatsappConnected ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-semibold tracking-wide backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Connected
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs font-semibold tracking-wide backdrop-blur-sm">
                  Not Connected
                </div>
              )}
            </div>

            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              WhatsApp Business
            </CardTitle>
            <CardDescription className="mt-2 text-[13px] leading-relaxed text-white/60">
              Broadcast campaigns, automated notifications, and AI-powered chat directly through Meta's Cloud API.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-7 pt-2 flex flex-col gap-5 relative z-10">
            {whatsappConnected && whatsappInfo ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Active Number</span>
                  <div className="flex items-center gap-2 font-mono text-2xl font-light tracking-tight">
                    <Phone className="w-5 h-5 text-white/50" />
                    <span>{whatsappInfo.phone_number || "Verified"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-4" /> /* spacer */
            )}

            <div className="pt-2">
              {!whatsappConnected ? (
                <Button 
                  onClick={handleConnectWhatsApp}
                  disabled={whatsappConnecting}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/20 h-12 transition-all font-medium text-[15px] group/btn border-0"
                >
                  {whatsappConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" /> }
                  Setup Integration
                </Button>
              ) : (
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl h-12 border-white/20 bg-white/5 shadow-sm hover:bg-white/10 text-white font-medium backdrop-blur-sm"
                    onClick={() => router.push("/integrations/whatsapp-settings")}
                  >
                    <Settings className="w-4 h-4 mr-2 text-white/70" /> Options
                  </Button>
                  <Button 
                    variant="outline"
                    className="aspect-square h-12 px-0 rounded-xl border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-colors backdrop-blur-sm"
                    onClick={handleDisconnectWhatsApp}
                    title="Disconnect"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
