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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            WhatsApp Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your WhatsApp Business Account connection and sync settings.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Connection Status Card */}
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <BrandIcon icon={WHATSAPP_ICON} className="w-6 h-6" />
                  </div>
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Your current WhatsApp Cloud API connection details
                </CardDescription>
              </div>
              <Badge 
                variant={status ? "default" : "secondary"}
                className={status ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {status ? "Connected" : "Disconnected"}
              </Badge>
            </CardHeader>
            <CardContent>
              {status ? (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-gray-50/50 dark:bg-gray-900/20">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Display Phone Number</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        <span className="font-bold">{status.phone_number || "Verified"}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border bg-gray-50/50 dark:bg-gray-900/20">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Assigned AI</p>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span className="font-bold">{status.ai_name || "Primary AI"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                    <p>WABA ID: <code className="font-mono bg-blue-100/50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">{status.waba_id}</code></p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={fetchStatus}>
                      <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect}>
                      <Trash2 className="w-4 h-4 mr-2" /> Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <AlertCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="font-bold text-lg">No Connection Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You haven't connected a WhatsApp number yet. Go back to Integrations to get started.
                    </p>
                  </div>
                  <Button onClick={() => router.push("/integrations")}>
                    Back to Integrations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Card */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-gray-500" />
                  Channel Configuration
                </CardTitle>
                <CardDescription>
                  Configure how WhatsApp messages are handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-dashed">
                  <div className="space-y-0.5">
                    <p className="font-medium">Message Templates</p>
                    <p className="text-xs text-muted-foreground">Keep your templates in sync with Meta's dashboard</p>
                  </div>
                  <Button size="sm" onClick={handleSync}>
                    <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Sync Now
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold text-amber-900 dark:text-amber-400">Webhook Status: Active</p>
                    <p className="text-amber-700/80 dark:text-amber-500/80">Receiving real-time messages and delivery logs.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
