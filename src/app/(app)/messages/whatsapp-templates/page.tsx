"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Plus, List, RefreshCw, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

const supabase = createClient();

interface IntegrationItem {
  ai_id: string | null;
  ai_name: string | null;
  phone_number: string | null;
  phone_number_id: string | null;
  waba_id: string | null;
  status: string | null;
}

export default function WhatsAppTemplatesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [displayNameByAi, setDisplayNameByAi] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) loadIntegrations();
  }, [user]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/whatsapp/list");
      const json = await resp.json();
      const list: IntegrationItem[] = Array.isArray(json?.items) ? json.items : [];
      setItems(list);

      // Fetch verified display names for each ai_id
      const aiIds = Array.from(new Set(list.map((i) => i.ai_id).filter(Boolean))) as string[];
      if (aiIds.length > 0) {
        const entries = await Promise.all(
          aiIds.map(async (id) => {
            try {
              const r = await fetch(`/api/whatsapp/display-name/status?ai_id=${encodeURIComponent(id)}`);
              const d = await r.json();
              const name = d?.verified_name || d?.new_display_name || "";
              return [id, name] as const;
            } catch {
              return [id, ""] as const;
            }
          })
        );
        setDisplayNameByAi(Object.fromEntries(entries));
      } else {
        setDisplayNameByAi({});
      }
    } catch (e) {
      console.error("Error loading WhatsApp integrations:", e);
      toast.error("Failed to load WhatsApp numbers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
            <FileText className="w-7 h-7 text-brand-orange" />
            Message Templates
          </h1>
          <p className="text-slate-500 mt-2 text-[15px]">
            Manage WhatsApp message templates for your ministry outreach.
          </p>
        </div>

        {/* WhatsApp Numbers Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="brand-gradient text-white border-0 rounded-2xl overflow-hidden relative shadow-xl shadow-slate-200/40">
            {/* Cross watermark */}
            <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
              <svg viewBox="0 0 100 120" className="w-[300px] h-[300px]" fill="white">
                <rect x="38" y="0" width="24" height="120" rx="4" />
                <rect x="10" y="28" width="80" height="24" rx="4" />
              </svg>
            </div>

            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Phone className="w-5 h-5 text-orange-400" />
                    Connected Numbers
                  </CardTitle>
                  <p className="text-white/50 text-sm mt-1">
                    {items.length} Phone Number{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadIntegrations}
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Sync Numbers
                </Button>
              </div>
            </CardHeader>

            <CardContent className="relative z-10">
              {loading ? (
                <div className="text-center py-8 text-white/60">Loading WhatsApp numbers...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/60 mb-4">No WhatsApp number connected</p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/integrations")}
                    className="border-orange-500/50 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
                  >
                    Connect WhatsApp
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="w-[220px] text-white/70">Verified Name</TableHead>
                        <TableHead className="text-white/70">Business App</TableHead>
                        <TableHead className="text-white/70">Phone Number</TableHead>
                        <TableHead className="text-white/70">Phone Number ID</TableHead>
                        <TableHead className="text-white/70">Waba ID</TableHead>
                        <TableHead className="text-white/70">Quality</TableHead>
                        <TableHead className="text-white/70">Throughput</TableHead>
                        <TableHead className="w-[200px] text-right text-white/70">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={`${it.ai_id}-${it.phone_number_id}`} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{(it.ai_id && displayNameByAi[it.ai_id]) || it.ai_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-emerald-300 border-emerald-500/40 bg-emerald-500/10">Cloud API</Badge>
                          </TableCell>
                          <TableCell className="text-white/80">{it.phone_number || "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-white/60">{it.phone_number_id || "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-white/60">{it.waba_id || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border border-orange-500/30">Standard</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-2">
                              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-sm" onClick={() => router.push(`/messages/whatsapp-templates/create?ai_id=${encodeURIComponent(it.ai_id || "")}`)}>
                                <Plus className="h-4 w-4 mr-1" /> Create
                              </Button>
                              <Button size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => router.push(`/messages/whatsapp-templates/list?ai_id=${encodeURIComponent(it.ai_id || "")}`)}>
                                <List className="h-4 w-4 mr-1" /> View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
