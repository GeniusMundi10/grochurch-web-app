import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateShort, getInitials } from "@/lib/utils";
import { MessageSquare, Send, Megaphone, Inbox, Plus } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">Communicate with your pastoral community</p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Compose Message
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Inbox className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{inbox.length}</div>
              <div className="text-xs text-gray-500">Inbox</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{sent.length}</div>
              <div className="text-xs text-gray-500">Sent</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{broadcasts.length}</div>
              <div className="text-xs text-gray-500">Broadcasts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Messages</h3>
        </div>

        {messages?.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {messages?.map((message) => (
              <div
                key={message.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  message.status === "sent" && message.recipient_id === user?.id ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-semibold flex-shrink-0">
                    {message.sender ? getInitials(message.sender.full_name) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {message.sender?.full_name || "Unknown"}
                        </span>
                        {message.is_broadcast && (
                          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            <Megaphone className="w-3 h-3" />
                            Broadcast
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[message.status]}`}>
                          {message.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDateShort(message.created_at)}</span>
                    </div>
                    <div className="font-medium text-gray-800 text-sm mb-1">{message.subject}</div>
                    <p className="text-sm text-gray-500 line-clamp-2">{message.body}</p>
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
