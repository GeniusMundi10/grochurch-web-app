import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateShort, getInitials } from "@/lib/utils";
import { MessageSquare, Send, Megaphone, Inbox, Plus, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("messages")
    .select("*, sender:profiles!sender_id(full_name, email, church_name)")
    .order("created_at", { ascending: false });

  const inbox = messages?.filter((m) => m.recipient_id === user?.id || m.is_broadcast) || [];
  const sent = messages?.filter((m) => m.sender_id === user?.id) || [];
  const broadcasts = messages?.filter((m) => m.is_broadcast) || [];

  const STATUS_COLORS: Record<string, string> = {
    sent: "bg-blue-100 text-blue-700",
    read: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-orange/10 rounded-2xl shadow-sm border border-brand-orange/20">
            <Mail className="w-8 h-8 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Messages</h1>
            <p className="text-slate-500 mt-0.5 text-[15px]">Communicate with your pastoral community</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 border-0">
          <Plus className="w-4 h-4" />
          Compose Message
        </button>
      </div>

      {/* Stats Section with Brand Gradient */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden rounded-[2rem] brand-gradient p-8 text-white shadow-xl border border-white/10">
        {/* Cross watermark */}
        <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.04] translate-x-1/4 translate-y-1/4">
          <svg viewBox="0 0 100 120" className="w-[300px] h-[300px]" fill="white">
            <rect x="38" y="0" width="24" height="120" rx="4" />
            <rect x="10" y="28" width="80" height="24" rx="4" />
          </svg>
        </div>

        <div className="relative z-10 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{inbox.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/60">New Messages</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30 shadow-inner">
              <Send className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{sent.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-orange-400/80">Sent Portal</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 shadow-inner">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{broadcasts.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/60">Broadcasts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-orange" />
            Pastoral Correspondence
          </h3>
        </div>

        {messages?.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium italic">No correspondence yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {messages?.map((message) => (
              <div
                key={message.id}
                className={`px-6 py-5 hover:bg-slate-50/80 transition-all cursor-pointer group ${
                  message.status === "sent" && message.recipient_id === user?.id ? "bg-orange-50/20" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-navy to-slate-700 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm border border-brand-navy/10 transform transition-transform group-hover:scale-105">
                    {message.sender ? getInitials(message.sender.full_name) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-800 text-[15px]">
                          {message.sender?.full_name || "Unknown"}
                        </span>
                        {message.is_broadcast && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full border border-purple-100/50">
                            <Megaphone className="w-3 h-3" />
                            Broadcast
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          message.status === 'sent' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' 
                            : 'bg-slate-100 text-slate-500 border-slate-200/50'
                        }`}>
                          {message.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 flex-shrink-0">{formatDateShort(message.created_at)}</span>
                    </div>
                    <div className="font-bold text-slate-700 text-sm mb-1 line-clamp-1">{message.subject}</div>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{message.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
