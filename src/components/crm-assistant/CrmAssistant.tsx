"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Send,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Bot,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCrmAssistant } from "@/context/CrmAssistantContext"
import { useUser } from "@/context/UserContext"
import { getSession } from "@/lib/auth"
import { getPageContext, findRelevantPages, CRM_PAGES } from "@/lib/crm-navigation"

// ─── Config ────────────────────────────────────────────────────────
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://growbro-backend.fly.dev"
const CRM_ASSISTANT_AI_ID =
  process.env.NEXT_PUBLIC_CRM_ASSISTANT_AI_ID || ""

// ─── Types ─────────────────────────────────────────────────────────
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  navigationLinks?: { name: string; path: string }[]
  quickOptions?: string[]
}

// ─── Quick action chips ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "📊 Community Stats", query: "Give me an overview of my church stats" },
  { label: "🙏🏻 New Members", query: "How many new members joined this month?" },
  { label: "📣 Announcements", query: "How do I send a community announcement?" },
  { label: "Import Members", query: "How do I import my congregation list?" },
]

// ─── Helpers ───────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).substring(2, 12)
}

function getSessionId(userId?: string) {
  const base = userId || "anon"
  return `crm-assistant-${base}`
}

function extractNavigationLinks(text: string) {
  const links: { name: string; path: string }[] = []
  const seen = new Set<string>()
  const cleanText = text.replace(/\[OPTION:\s*[^\]]+\]/g, "")

  for (const page of CRM_PAGES) {
    const nameLower = page.name.toLowerCase()
    const textLower = cleanText.toLowerCase()

    if (
      textLower.includes(nameLower) ||
      textLower.includes(page.path) ||
      page.keywords.some((kw) => kw.length > 3 && textLower.includes(kw))
    ) {
      if (!seen.has(page.path)) {
        seen.add(page.path)
        links.push({ name: page.name, path: page.path })
      }
    }
  }

  return links.slice(0, 4)
}

function extractQuickOptions(text: string): string[] {
  const regex = /\[OPTION:\s*([^\]]+)\]/g
  const options: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    const val = match[1].trim()
    if (val && !options.includes(val)) {
      options.push(val)
    }
  }
  return options
}

function stripOptionMarkers(text: string): string {
  return text.replace(/\[OPTION:\s*[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim()
}

// ─── Component ─────────────────────────────────────────────────────
export default function CrmAssistant() {
  const { isOpen, close } = useCrmAssistant()
  const { user } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Restore history
  useEffect(() => {
    if (!isOpen || historyLoaded || !user?.id || !CRM_ASSISTANT_AI_ID) return

    const restoreHistory = async () => {
      try {
        const session = await getSession()
        if (!session?.access_token) return

        const res = await fetch(`${BACKEND_URL}/api/crm_assistant/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_token: session.access_token,
            crm_user_id: user.id,
            ai_id: CRM_ASSISTANT_AI_ID,
            platform: "grochurch",
          }),
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          const restored: Message[] = data.messages.map(
            (msg: { role: string; content: string; timestamp: string }) => ({
              id: generateId(),
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              navigationLinks:
                msg.role === "assistant"
                  ? extractNavigationLinks(msg.content)
                  : undefined,
              quickOptions:
                msg.role === "assistant"
                  ? extractQuickOptions(msg.content)
                  : undefined,
            })
          )
          setMessages(restored)
          setHasStarted(true)
        }
      } catch (err) {
        console.error("[CRM Assistant] History restore failed:", err)
      } finally {
        setHistoryLoaded(true)
      }
    }

    restoreHistory()
  }, [isOpen, historyLoaded, user?.id])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // ─── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isStreaming) return
      if (!CRM_ASSISTANT_AI_ID) {
        handleLocalFallback(messageText)
        return
      }

      setHasStarted(true)

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: messageText.trim(),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsStreaming(true)

      const assistantId = generateId()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ])

      try {
        const controller = new AbortController()
        abortControllerRef.current = controller

        const pageContext = getPageContext(pathname)
        let activeConversationId = null;
        
        const conversationIdMatch = pathname.match(/\/chat\/([^/]+)/);
        if (conversationIdMatch) {
            activeConversationId = conversationIdMatch[1];
        }
        
        if (!activeConversationId && typeof window !== 'undefined') {
            activeConversationId = localStorage.getItem("active_crm_conversation_id");
        }

        let contextualMessage = `[CRM Context: ${pageContext}]\n`;
        if (activeConversationId) {
            contextualMessage += `[Active Conversation ID on Screen: ${activeConversationId}]\n`;
        }
        contextualMessage += `\nUser question: ${messageText.trim()}`

        const session = await getSession()

        const response = await fetch(
          `${BACKEND_URL}/api/dynamic_chat/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: contextualMessage,
              session_id: getSessionId(user?.id),
              ai_id: CRM_ASSISTANT_AI_ID,
              conversation_id: null,
              auth_token: session?.access_token,
              platform: "grochurch",
            }),
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader available")

        const decoder = new TextDecoder()
        let fullText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          if (chunk.includes("<!-- SOURCES_START -->")) {
            const parts = chunk.split("<!-- SOURCES_START -->")
            fullText += parts[0]
          } else if (chunk.includes("<!-- SOURCES_END -->")) {
            continue
          } else {
            fullText += chunk
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                  ...msg,
                  content: fullText,
                  navigationLinks: extractNavigationLinks(fullText),
                  quickOptions: extractQuickOptions(fullText),
                }
                : msg
            )
          )
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                ...msg,
                content: fullText || "I couldn't process that request. Please try again.",
                navigationLinks: extractNavigationLinks(fullText),
                quickOptions: extractQuickOptions(fullText),
              }
              : msg
          )
        )
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("[CRM Assistant] Stream error:", err)

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                ...msg,
                content:
                  "PROF! is having trouble connecting right now. Let me try to help you locally.",
                navigationLinks: findRelevantPages(messageText).map((p) => ({
                  name: p.name,
                  path: p.path,
                })),
              }
              : msg
          )
        )
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [isStreaming, pathname, user?.id]
  )

  const handleLocalFallback = useCallback((query: string) => {
    setHasStarted(true)

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: query,
      timestamp: new Date(),
    }

    const relevantPages = findRelevantPages(query)
    const navLinks = relevantPages.map((p) => ({ name: p.name, path: p.path }))

    let responseText: string
    if (relevantPages.length > 0) {
      responseText = `Based on your question, here are the most relevant pages:\n\n${relevantPages
        .map((p) => `**${p.name}** — ${p.description}`)
        .join("\n\n")}\n\nClick a link below to navigate there directly.`
    } else {
      responseText =
        "I couldn't find a specific page for that. Try browsing the **Help Center** for guides, or check the **sidebar menu**."
    }

    const assistantMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
      navigationLinks: navLinks.length > 0 ? navLinks : [{ name: "Dashboard", path: "/dashboard" }],
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput("")
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleNavigate = (path: string) => {
    router.push(path)
    close()
  }

  const handleReset = async () => {
    setMessages([])
    setHasStarted(false)
    setHistoryLoaded(false)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (CRM_ASSISTANT_AI_ID && user?.id) {
      try {
        const session = await getSession()
        if (session?.access_token) {
          fetch(`${BACKEND_URL}/api/crm_assistant/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_token: session.access_token,
              crm_user_id: user.id,
              ai_id: CRM_ASSISTANT_AI_ID,
              platform: "grochurch",
            }),
          }).catch(() => {})
        }
      } catch {} 
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed right-0 top-0 z-[61] flex h-screen w-full max-w-[420px] flex-col border-l border-white/10 bg-white shadow-2xl dark:bg-slate-950 dark:shadow-indigo-500/5"
          >
            {/* ── Header ──────────────────────────────────────── */}
            <div className="relative flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-indigo-100 to-indigo-50 dark:from-indigo-950 dark:to-indigo-900 border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
                  <motion.img 
                    src="/Prof.PNG" 
                    alt="PROF! Avatar" 
                    className="h-full w-full object-cover"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    PROF!
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your GroChurch Guide
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  title="Reset conversation"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/5 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={close}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Messages area ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              <div className="flex flex-col gap-4 min-h-full">
                {/* Welcome state */}
                {!hasStarted && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col items-center py-6 text-center m-auto"
                  >
                    <div className="mb-4 relative h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950 dark:to-slate-950 border border-indigo-100 dark:border-indigo-900/50 shadow-xl overflow-hidden">
                      <motion.img 
                        src="/Prof.PNG" 
                        alt="PROF!" 
                        className="h-full w-full object-cover"
                        animate={{ scale: [1, 1.05, 1], y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      />
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
                      Hi{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! 🙏
                    </h3>
                    <p className="mb-6 max-w-[280px] text-sm text-slate-500 dark:text-slate-400">
                      I am PROF! I can guide you through GroChurch, help you manage your congregation, and answer your questions.
                    </p>

                    {/* Quick action chips */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => sendMessage(action.query)}
                          className="group flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-100 hover:shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/15"
                        >
                          <Sparkles className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx === messages.length - 1 ? 0.05 : 0 }}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                        <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 mr-2 mt-auto mb-1 overflow-hidden border border-indigo-200 dark:border-indigo-800">
                            <img src="/Prof.PNG" alt="PROF!" className="h-full w-full object-cover" />
                        </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "rounded-br-md bg-indigo-600 text-white shadow-lg shadow-indigo-500/15"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      )}
                    >
                      {/* Streaming indicator */}
                      {msg.role === "assistant" &&
                        isStreaming &&
                        idx === messages.length - 1 &&
                        !msg.content && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <div className="flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                            </div>
                            <span className="text-xs">Thinking...</span>
                          </div>
                        )}

                      {/* Message content */}
                      {msg.content && (
                        <div
                          className="whitespace-pre-wrap [&_strong]:font-semibold"
                          dangerouslySetInnerHTML={{
                            __html: stripOptionMarkers(msg.content)
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                              .replace(/\s*(at|in|to)\s+\/([a-z0-9]+(\s*-\s*[a-z0-9]+)*\/?)+/gi, "")
                              .replace(/\s*\(\/[^)]+\)/g, "")
                              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                              .replace(/\n/g, "<br />"),
                          }}
                        />
                      )}

                      {/* Quick-reply option buttons */}
                      {msg.quickOptions &&
                        msg.quickOptions.length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-200/60 pt-3 dark:border-white/10">
                            <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Choose an option
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                              {msg.quickOptions.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  onClick={() => {
                                    if (!isStreaming) sendMessage(opt)
                                  }}
                                  disabled={isStreaming}
                                  className="group flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-all hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-sm disabled:opacity-40 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/15"
                                >
                                  <Sparkles className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                                  <span className="truncate max-w-[200px]">{opt}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Navigation links */}
                      {msg.navigationLinks &&
                        msg.navigationLinks.length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-200/60 pt-3 dark:border-white/10">
                            <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Navigate to
                            </span>
                            {msg.navigationLinks.map((link) => (
                              <button
                                key={link.path}
                                onClick={() => handleNavigate(link.path)}
                                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                              >
                                <span className="flex items-center gap-2">
                                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                  {link.name}
                                </span>
                                <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                ))}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ── Input area ──────────────────────────────────── */}
            <div className="border-t border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask PROF!..."
                  disabled={isStreaming}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none ring-indigo-500/20 transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500/40 dark:focus:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:opacity-40 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                Powered by GrowBro AI · Your Pastoral Guide
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
