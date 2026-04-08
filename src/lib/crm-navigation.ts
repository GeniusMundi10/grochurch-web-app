/**
 * CRM Navigation Map — used by the CRM Assistant to suggest pages
 * and navigate users. Each entry maps a route to a description
 * so the assistant can intelligently route users.
 */

export interface CrmPage {
  path: string
  name: string
  description: string
  keywords: string[]
}

export const CRM_PAGES: CrmPage[] = [
  {
    path: "/dashboard",
    name: "Dashboard",
    description: "View community growth analytics, engagement metrics, and high-level church statistics.",
    keywords: ["analytics", "stats", "metrics", "dashboard", "data", "engagement", "reports", "performance", "overview"],
  },
  {
    path: "/members",
    name: "Members",
    description: "Manage your congregation, church members, and regular attendees. View details like contact info, involvement, and tags.",
    keywords: ["members", "congregation", "attendees", "people", "directory", "contacts"],
  },
  {
    path: "/messages",
    name: "Messages",
    description: "View and manage recent conversations. Respond directly to incoming prayer requests and community queries.",
    keywords: ["messages", "chat", "conversations", "inbox", "respond", "communication", "live chat"],
  },
  {
    path: "/prospects",
    name: "Prospects & Visitors",
    description: "Manage first-time guests, visitors, or leads who are not yet full members.",
    keywords: ["prospects", "visitors", "guests", "newcomers", "leads"],
  },
  {
    path: "/ai-assistant",
    name: "AI Assistant Configuration",
    description: "Configure your church's AI helper, update its knowledge base, and track its performance.",
    keywords: ["ai", "assistant", "bot", "setup", "knowledge base", "training"],
  },
  {
    path: "/integrations",
    name: "Integrations",
    description: "Connect to third-party tools like WhatsApp, Planning Center, and social media platforms.",
    keywords: ["integrations", "connect", "whatsapp", "third party", "api"],
  },
  {
    path: "/billing",
    name: "Billing",
    description: "Manage your GroChurch subscription plan and billing methods.",
    keywords: ["billing", "pricing", "plans", "upgrade", "subscription", "payment"],
  },
  {
    path: "/settings",
    name: "Settings",
    description: "Manage your account, church profile, and team settings.",
    keywords: ["settings", "profile", "account", "preferences", "team"],
  },
]

/**
 * Find the best matching CRM page(s) for a user query.
 * Used client-side for quick navigation suggestions.
 */
export function findRelevantPages(query: string, maxResults = 3): CrmPage[] {
  const q = query.toLowerCase()
  const scored = CRM_PAGES.map((page) => {
    let score = 0
    // Exact name match
    if (q.includes(page.name.toLowerCase())) score += 10
    // Keyword matches
    for (const kw of page.keywords) {
      if (q.includes(kw)) score += 5
      // Partial keyword match
      const words = kw.split(" ")
      for (const w of words) {
        if (q.includes(w) && w.length > 2) score += 2
      }
    }
    // Description word matches
    const descWords = page.description.toLowerCase().split(/\s+/)
    const queryWords = q.split(/\s+/)
    for (const qw of queryWords) {
      if (qw.length > 2 && descWords.includes(qw)) score += 1
    }
    return { page, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.page)
}

/**
 * Build a navigation context string for the AI prompt.
 * This tells the assistant what page the user is currently on.
 */
export function getPageContext(pathname: string): string {
  const page = CRM_PAGES.find(
    (p) => pathname === p.path || pathname.startsWith(p.path + "/")
  )
  if (page) {
    return `The user is currently on the "${page.name}" page (${page.path}). ${page.description}`
  }
  return `The user is on page: ${pathname}`
}
