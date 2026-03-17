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
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-32 bg-gray-100 dark:bg-gray-800" />
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(
          "overflow-hidden border transition-all duration-300",
          whatsappConnected ? "border-gray-200 shadow-sm" : "border-gray-100 hover:border-gray-300 hover:shadow-sm"
        )}>
          <CardHeader className="relative p-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-transparent to-transparent opacity-50" />
            <div className="p-6 flex items-start justify-between relative z-10">
              <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <BrandIcon icon={WHATSAPP_ICON} className="w-8 h-8" />
              </div>
              {whatsappConnected ? (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-500 shadow-none dark:bg-gray-800 dark:text-gray-400">
                  Not Connected
                </Badge>
              )}
            </div>
            <div className="px-6 pb-4 relative z-10">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                WhatsApp Business
                <Zap className="w-4 h-4 text-blue-500 fill-blue-500/20" />
              </CardTitle>
              <CardDescription className="mt-1.5 line-clamp-2">
                Broadcast campaigns, automated notifications, and AI-powered chat over WhatsApp.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0 flex flex-col gap-4">
            {whatsappConnected && whatsappInfo && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <Phone className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Active Number</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {whatsappInfo.phone_number || "Verified Number"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              {!whatsappConnected ? (
                <Button 
                  onClick={handleConnectWhatsApp}
                  disabled={whatsappConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 h-11 transition-all"
                >
                  {whatsappConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Connect Numbers
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl h-11"
                    onClick={() => router.push("/integrations/whatsapp-settings")}
                  >
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="aspect-square h-11 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
                    onClick={handleDisconnectWhatsApp}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Supports Cloud API</span>
              </div>
              <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                Docs <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
