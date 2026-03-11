"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Plus, List, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen bg-white">
      <Header 
        title="WhatsApp Templates" 
        description="Manage WhatsApp message templates for your business"
        showTitleInHeader={false}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">WhatsApp Numbers</CardTitle>
              <Button variant="outline" size="sm" onClick={loadIntegrations}>
                <RefreshCw className="h-4 w-4 mr-2" /> Sync Numbers
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
              <div>
                {items.length} Phone Number{items.length === 1 ? "" : "s"}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading WhatsApp numbers...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">No WhatsApp number connected</p>
                <Button variant="outline" onClick={() => router.push("/integrations")}>
                  Connect WhatsApp
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Verified Name</TableHead>
                      <TableHead>Business App</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Phone Number ID</TableHead>
                      <TableHead>Waba ID</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Throughput</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={`${it.ai_id}-${it.phone_number_id}`}>
                        <TableCell className="font-medium">{(it.ai_id && displayNameByAi[it.ai_id]) || it.ai_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300">Cloud API</Badge>
                        </TableCell>
                        <TableCell>{it.phone_number || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{it.phone_number_id || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{it.waba_id || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">Standard</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push(`/whatsapp-templates/create?ai_id=${encodeURIComponent(it.ai_id || "")}`)}> 
                              <Plus className="h-4 w-4 mr-1" /> Create
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/whatsapp-templates/list?ai_id=${encodeURIComponent(it.ai_id || "")}`)}>
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
      </div>
    </div>
  );
}
