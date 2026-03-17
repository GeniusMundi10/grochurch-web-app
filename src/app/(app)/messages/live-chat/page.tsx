"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Search, MessageCircle, ArrowLeft, Phone, User } from "lucide-react";

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_type: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  message_type: string;
  status: string;
  created_at: string;
}

export default function LiveChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Poll messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation.id);
    const interval = setInterval(() => fetchMessages(selectedConversation.id), 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      direction: "outbound",
      content: messageText,
      message_type: "text",
      status: "sent",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();

      if (!data.success) {
        // Replace optimistic message with error state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMessage.id ? { ...m, status: "failed" } : m
          )
        );
      } else if (data.message) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? data.message : m))
        );
      }

      // Refresh conversations list to update preview
      fetchConversations();
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id ? { ...m, status: "failed" } : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return phone.slice(-2);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.contact_name?.toLowerCase().includes(q)) ||
      c.contact_phone.includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Left Panel - Conversation List */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-96 border-r border-slate-100 bg-white`}
      >
        {/* Header */}
        <div className="px-5 py-4 brand-gradient shadow-md relative overflow-hidden">
          {/* Subtle cross in header */}
          <div className="absolute right-0 top-0 pointer-events-none opacity-[0.05] translate-x-1/3 -translate-y-1/3">
            <svg viewBox="0 0 100 120" className="w-24 h-24" fill="white">
              <rect x="38" y="0" width="24" height="120" rx="4" />
              <rect x="10" y="28" width="80" height="24" rx="4" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2 relative z-10">
            <MessageCircle className="w-5 h-5 text-brand-orange" />
            Pastoral Chat
          </h2>
        </div>

        {/* Search */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm italic">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 px-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <MessageCircle className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No conversations yet</p>
              <p className="text-xs mt-2 leading-relaxed">
                Member replies to your WhatsApp campaigns will appear here for direct pastoral care.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-all border-l-4 ${
                  selectedConversation?.id === conv.id 
                    ? "bg-brand-orange/5 border-brand-orange shadow-sm" 
                    : "border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-navy to-slate-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm border border-brand-navy/10">
                  {getInitials(conv.contact_name, conv.contact_phone)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-bold truncate ${
                      selectedConversation?.id === conv.id ? "text-slate-900" : "text-slate-700"
                    }`}>
                      {conv.contact_name || conv.contact_phone}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 uppercase">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate leading-relaxed">
                      {conv.last_message_preview || "No messages"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="bg-brand-orange text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2 shadow-sm animate-pulse">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div
        className={`${
          selectedConversation ? "flex" : "hidden md:flex"
        } flex-col flex-1 bg-slate-50 relative`}
      >
        {/* Cross background for chat area */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 120" className="w-[800px] h-[800px]" fill="currentColor">
            <rect x="38" y="0" width="24" height="120" rx="4" />
            <rect x="10" y="28" width="80" height="24" rx="4" />
          </svg>
        </div>

        {!selectedConversation ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 relative z-10 px-6 text-center">
            <div className="w-24 h-24 rounded-[2rem] brand-gradient flex items-center justify-center mb-6 shadow-xl border border-white/10">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">GroChurch Pastoral Care</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
              Connect directly with your congregation. Select a conversation to begin a shared journey.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-4 px-6 py-4 brand-gradient shadow-lg border-b border-white/10 relative z-20">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-inner">
                {getInitials(selectedConversation.contact_name, selectedConversation.contact_phone)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate tracking-tight">
                  {selectedConversation.contact_name || selectedConversation.contact_phone}
                </p>
                <p className="text-white/60 text-xs flex items-center gap-1.5 font-medium uppercase tracking-wider">
                  <Phone className="w-3 h-3 text-brand-orange" />
                  {selectedConversation.contact_phone}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 relative z-10">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                   Beginning of a new conversation...
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md border ${
                        msg.direction === "outbound"
                          ? "bg-brand-navy text-white rounded-tr-none border-white/10"
                          : "bg-white text-slate-800 rounded-tl-none border-slate-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                        {msg.content}
                      </p>
                      <div className={`flex items-center gap-1.5 mt-2 ${
                        msg.direction === 'outbound' ? 'justify-end text-white/50' : 'justify-start text-slate-400'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {new Date(msg.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.direction === "outbound" && (
                          <span className="text-[10px] font-black">
                            {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : msg.status === "failed" ? "✗" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 py-5 bg-white border-t border-slate-100 relative z-20">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    placeholder="Provide pastoral care..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full resize-none rounded-2xl border border-slate-200 pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-slate-50 min-h-[48px] max-h-[150px] transition-all font-medium placeholder:text-slate-400"
                    rows={1}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-brand-orange hover:bg-orange-600 disabled:bg-slate-200 text-white p-3.5 rounded-2xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
