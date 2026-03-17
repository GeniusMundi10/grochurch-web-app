"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import type { ReactElement, ReactNode } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Eye, Send, Search,
  MoreVertical, Type, Image as ImageIcon, Video,
  FileText, MapPin, Archive
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";

type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "DRAFT" | "ARCHIVED";
type StatusFilter = TemplateStatus | "ALL";
type TemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

interface Template {
  id: string;
  template_id?: string;
  db_id?: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  template_type: string;
  body_text: string;
  header_text?: string;
  header_media_url?: string;
  footer_text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
  created_at: string;
}

function TemplatesListContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ai_id = searchParams.get("ai_id");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [templateArchiving, setTemplateArchiving] = useState(false);
  const [hasIntegration, setHasIntegration] = useState(true);
  const supabase = createClient();
  const handleStatusChange = (value: string) => setStatusFilter(value as StatusFilter);
  useEffect(() => {
    if (user?.id && ai_id) {
      loadTemplates();
      checkIntegration();
    }
  }, [user, ai_id]);

  const checkIntegration = async () => {
    if (!user?.id || !ai_id) return;
    const { data, error } = await supabase
      .from("whatsapp_integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("ai_id", ai_id)
      .maybeSingle();

    setHasIntegration(!!data);
  };

  useEffect(() => {
    filterTemplates();
  }, [templates, statusFilter, searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/whatsapp/templates/list?ai_id=${encodeURIComponent(ai_id!)}&include_archived=true`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error || data?.message || data?.body || "Failed";
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }

      // Normalize possible shapes: {templates}, {items}, {data}, or array
      const rows: any[] =
        (Array.isArray((data as any)?.templates) && (data as any).templates) ||
        (Array.isArray((data as any)?.items) && (data as any).items) ||
        (Array.isArray((data as any)?.data) && (data as any).data) ||
        (Array.isArray(data) ? (data as any) : []);

      const mapped: Template[] = rows.map((t: any) => {
        // Prefer Graph fields
        const comps = Array.isArray(t?.components) ? t.components : [];
        const body = comps.find((c: any) => (c?.type || '').toUpperCase() === 'BODY');
        const header = comps.find((c: any) => (c?.type || '').toUpperCase() === 'HEADER');
        const footer = comps.find((c: any) => (c?.type || '').toUpperCase() === 'FOOTER');

        // Determine type: HEADER.format or first non-BODY type
        const nonBody = comps.find((c: any) => (c?.type || '').toUpperCase() !== 'BODY');
        const typeRaw = (header?.format || nonBody?.type || 'TEXT').toString().toUpperCase();

        // Map status to our union
        const s = (t?.status || '').toString().toUpperCase();
        const status: TemplateStatus = s.includes('ARCHIVE')
          ? 'ARCHIVED'
          : s.includes('APPROVED')
            ? 'APPROVED'
            : s.includes('REJECT')
              ? 'REJECTED'
              : s.includes('DRAFT')
                ? 'DRAFT'
                : 'PENDING';

        const hasGraphId = typeof t.id === "string" && typeof t.db_id === "string"
          ? t.id !== t.db_id
          : typeof t.id === "string" && typeof t.db_id === "undefined";

        const metaTemplateId = hasGraphId
          ? t.id
          : (typeof t.template_id === "string" ? t.template_id : null);

        const dbId = typeof t.db_id === "string"
          ? t.db_id
          : (!hasGraphId && typeof t.id === "string" ? t.id : null);

        // Extract buttons
        const buttonsComp = comps.find((c: any) => (c?.type || '').toUpperCase() === 'BUTTONS');
        const buttons = buttonsComp?.buttons?.map((b: any) => ({
          type: b.type || 'QUICK_REPLY',
          text: b.text || '',
          url: b.url,
          phone_number: b.phone_number,
        })) || [];

        return {
          id: metaTemplateId ? `meta:${metaTemplateId}` : `db:${dbId || crypto.randomUUID()}`,
          template_id: metaTemplateId || null,
          db_id: dbId || null,
          name: t.name || t.template_name || 'template',
          category: ((t.category || 'UTILITY') as string).toUpperCase() as TemplateCategory,
          status,
          language: t.language || t.lang || 'en',
          template_type: typeRaw,
          body_text: body?.text || '',
          header_text: header?.text,
          header_media_url: header?.example?.header_handle?.[0] || t.header_media_url,
          footer_text: footer?.text,
          buttons: buttons.length > 0 ? buttons : undefined,
          created_at: t.last_updated_time || t.updated_time || t.created_time || new Date().toISOString(),
        };
      }) as Template[];
      setTemplates(mapped);
    } catch (error: any) {
      console.error("[Templates] Load error:", error);
      toast.error(`Failed to load templates from Meta: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!ai_id) return;
    setSyncing(true);
    try {
      const resp = await fetch("/api/whatsapp/templates/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_id })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.success) {
        const err = data?.error || data?.message || "Failed to sync templates";
        throw new Error(typeof err === "string" ? err : JSON.stringify(err));
      }

      toast.success(`Synced ${data.synced || 0} templates`);
      await loadTemplates();
    } catch (error: any) {
      console.error("[Templates] Sync error:", error);
      toast.error(error?.message || "Failed to sync templates");
    } finally {
      setSyncing(false);
    }
  };

  const filterTemplates = () => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = templates.filter((template) => {
      const matchesStatus = statusFilter === "ALL"
        ? true
        : template.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      return (
        template.name.toLowerCase().includes(query) ||
        template.body_text.toLowerCase().includes(query)
      );
    });

    setFilteredTemplates(filtered);
  };

  const getStatusBadge = (status: TemplateStatus) => {
    const badges: Record<TemplateStatus, ReactElement> = {
      APPROVED: <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Approved</Badge>,
      PENDING: <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pending</Badge>,
      REJECTED: <Badge className="bg-red-500 hover:bg-red-600 text-white">Rejected</Badge>,
      DRAFT: <Badge className="bg-gray-500 hover:bg-gray-600 text-white">Draft</Badge>,
      ARCHIVED: <Badge className="bg-gray-400 hover:bg-gray-500 text-white">Archived</Badge>
    };
    return badges[status];
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      TEXT: <Type className="h-4 w-4" />,
      IMAGE: <ImageIcon className="h-4 w-4" />,
      VIDEO: <Video className="h-4 w-4" />,
      DOCUMENT: <FileText className="h-4 w-4" />,
      LOCATION: <MapPin className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <Type className="h-4 w-4" />;
  };

  const getTemplateInfo = (template: Template) => {
    const variableCount = (template.body_text.match(/\{\{[^}]+\}\}/g) || []).length;
    const hasHeader = template.header_text || template.template_type !== "TEXT";
    const hasFooter = !!template.footer_text;

    const info: ReactNode[] = [];
    if (hasHeader) info.push(getTypeIcon(template.template_type));
    if (variableCount > 0) info.push(`${variableCount} var`);
    if (hasFooter) info.push("Footer");

    return info;
  };

  const handleArchiveTemplate = async () => {
    if (!selectedTemplate || !ai_id) return;
    setTemplateArchiving(true);
    try {
      const payload: Record<string, any> = {
        ai_id,
        name: selectedTemplate.name,
        template_id: selectedTemplate.template_id,
        db_id: selectedTemplate.db_id
      };

      const resp = await fetch("/api/whatsapp/templates/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || "Failed to delete template");
      }

      toast.success(`Template "${selectedTemplate.name}" archived`);
      setArchiveConfirmOpen(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (error: any) {
      console.error("[Templates] Delete error", error);
      toast.error(error?.message || "Failed to delete template");
    } finally {
      setTemplateArchiving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/messages/whatsapp-templates")}
            className="text-slate-500 hover:text-brand-navy"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing || !hasIntegration}
              className="flex items-center gap-2 border-brand-navy/20 text-brand-navy hover:bg-brand-navy/5"
            >
              {syncing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-brand-orange border-r-transparent" />
                  Syncing...
                </>
              ) : (
                "Sync with Meta"
              )}
            </Button>
            <Button
              onClick={() => router.push(`/messages/whatsapp-templates/create?ai_id=${ai_id || ""}`)} 
              disabled={!hasIntegration}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>

        {/* Page Title */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
            <FileText className="w-6 h-6 text-brand-orange" />
            Templates Library
          </h1>
        </motion.div>

        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardContent className="p-0">
            {!hasIntegration && (
              <div className="m-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 border border-yellow-200">
                <p className="font-medium">No WhatsApp Integration Found</p>
                <p className="mt-1">This AI does not have a connected WhatsApp number. Please connect one in Integrations.</p>
              </div>
            )}
            {/* Filters */}
            <div className="p-4 border-b space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={handleStatusChange}>
                <TabsList className="grid w-full grid-cols-6 gap-2">
                  <TabsTrigger value="ALL">All</TabsTrigger>
                  <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                  <TabsTrigger value="PENDING">Pending</TabsTrigger>
                  <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                  <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                  <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Templates Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template Type</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead className="w-[150px]">Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        Loading templates...
                      </TableCell>
                    </TableRow>
                  ) : filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        No templates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.category}</TableCell>
                        <TableCell>{template.language}</TableCell>
                        <TableCell>{getStatusBadge(template.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(template.template_type)}
                            <span className="capitalize">{template.template_type.toLowerCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getTemplateInfo(template).map((item, idx) => (
                              <span key={idx} className="flex items-center gap-1">
                                {item}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(parseISO(template.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setPreviewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Navigate to campaigns with pre-selected template
                                  router.push(`/whatsapp-campaigns?template=${template.id}`);
                                }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                disabled={template.status === "ARCHIVED"}
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setArchiveConfirmOpen(true);
                                }}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredTemplates.length} of {templates.length} templates
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page: 10</span>
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <span className="text-sm px-3 py-1 bg-gray-100 rounded">Page 1 of 1</span>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Preview how this template will appear to customers</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {/* Metadata chips */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">{selectedTemplate.name}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{selectedTemplate.category.toLowerCase()}</Badge>
                {getStatusBadge(selectedTemplate.status)}
                <Badge variant="outline" className="text-xs">{selectedTemplate.language}</Badge>
              </div>

              {/* WhatsApp-style message bubble */}
              <div className="rounded-2xl bg-gradient-to-b from-[#e5ded8] to-[#d9d2cb] p-4">
                <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-xs mx-auto">
                  {/* Header */}
                  {selectedTemplate.template_type === 'TEXT' && selectedTemplate.header_text && (
                    <div className="px-4 pt-3 pb-1 font-semibold text-slate-900 text-sm">
                      {selectedTemplate.header_text}
                    </div>
                  )}
                  {selectedTemplate.template_type === 'VIDEO' && (
                    <div className="relative h-44 w-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <span className="text-white/70 text-xs font-medium tracking-wide uppercase">Video</span>
                    </div>
                  )}
                  {selectedTemplate.template_type === 'IMAGE' && (
                    <div className="relative h-44 w-full bg-gradient-to-br from-slate-200 to-slate-300 flex flex-col items-center justify-center gap-2 overflow-hidden">
                      {selectedTemplate.header_media_url && selectedTemplate.header_media_url.startsWith('https') ? (
                        <img src={selectedTemplate.header_media_url} alt="Template Header" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                          <span className="text-slate-500 text-xs font-medium tracking-wide uppercase">Image</span>
                        </>
                      )}
                    </div>
                  )}
                  {selectedTemplate.template_type === 'DOCUMENT' && (
                    <div className="relative h-32 w-full bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                      <span className="text-blue-500 text-xs font-medium tracking-wide uppercase">Document</span>
                    </div>
                  )}

                  {/* Body */}
                  {selectedTemplate.body_text && (
                    <div className="px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedTemplate.body_text}
                    </div>
                  )}

                  {/* Footer */}
                  {selectedTemplate.footer_text && (
                    <div className="px-4 pb-2 text-xs text-slate-400">
                      {selectedTemplate.footer_text}
                    </div>
                  )}

                  {/* Buttons */}
                  {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                    <div className="border-t divide-y">
                      {selectedTemplate.buttons.map((btn, idx) => (
                        <div key={idx} className="px-4 py-2.5 text-center text-blue-600 text-sm font-medium">
                          {btn.text || `Button ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive template</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving removes the template from Meta and hides it from new campaigns, but keeps past campaign history. You can recreate the template later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={templateArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveTemplate}
              disabled={templateArchiving}
              className="bg-red-600 hover:bg-red-700"
            >
              {templateArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TemplatesListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent flex items-center justify-center">Loading...</div>}>
      <TemplatesListContent />
    </Suspense>
  );
}
