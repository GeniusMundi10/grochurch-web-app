import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import RecentActivity from "@/components/dashboard/RecentActivity";
import Link from "next/link";
import {
  Users,
  MessageCircle,
  Megaphone,
  Check,
  CreditCard,
  Crown,
  ArrowUpRight,
  Heart,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Helper — group leads by week label
function groupByWeek(leads: { created_at: string }[]) {
  const buckets: Record<string, number> = {};
  for (const lead of leads) {
    const d = new Date(lead.created_at);
    // Start of week (Monday)
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets[label] = (buckets[label] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([week, contacts]) => ({ week, contacts }))
    .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) return <div>User not found or unauthenticated.</div>;

  const admin = createAdminClient();

  // ── 10-week window for growth chart ──────────────────────────────────────
  const tenWeeksAgo = new Date();
  tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70);

  const [
    { count: totalMembers },
    { count: totalConversations },
    { count: totalCampaigns },
    { data: recentLeads },
    { data: profile },
    { data: campaigns },
    { data: leadsForChart },
    { data: allLeads },
    { data: allMessages },
  ] = await Promise.all([
    admin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("wa_conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("whatsapp_campaigns").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("leads")
      .select("id, name, phone, source, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    admin.from("profiles").select("service_plan").eq("id", user.id).single(),
    admin.from("whatsapp_campaigns")
      .select("campaign_name, status, created_at, sent_count, delivered_count, read_count, replied_count, failed_count, total_recipients")
      .eq("user_id", user.id),
    admin.from("leads")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", tenWeeksAgo.toISOString()),
    admin.from("leads")
      .select("status")
      .eq("user_id", user.id),
    admin.from("wa_messages")
      .select("direction, created_at")
      .eq("user_id", user.id),
  ]);

  // ── Aggregate campaign stats ──────────────────────────────────────────────
  const campaignStats = (campaigns ?? []).reduce(
    (acc, c) => ({
      totalReached: acc.totalReached + (c.total_recipients ?? 0),
      sent: acc.sent + (c.sent_count ?? 0),
      delivered: acc.delivered + (c.delivered_count ?? 0),
      read: acc.read + (c.read_count ?? 0),
      replied: acc.replied + (c.replied_count ?? 0),
    }),
    { totalReached: 0, sent: 0, delivered: 0, read: 0, replied: 0 }
  );

  // ── Weekly growth data for chart ─────────────────────────────────────────
  const weeklyGrowth = groupByWeek(leadsForChart ?? []);

  // ── Visitor Stages ────────────────────────────────────────────────────────
  const stageCounts: Record<string, number> = {};
  for (const l of (allLeads || [])) {
    const s = l.status || "new_visitor";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  }
  const visitorStages = Object.entries(stageCounts).map(([status, count]) => ({ status, count }));

  // ── Message Activity & Balance ───────────────────────────────────────────
  let inbound = 0;
  let outbound = 0;
  const daysCount = [0, 0, 0, 0, 0, 0, 0];
  
  for (const m of (allMessages || [])) {
    if (m.direction === "inbound" || m.direction === "INBOUND") inbound++;
    if (m.direction === "outbound" || m.direction === "OUTBOUND") outbound++;
    
    if (m.created_at) {
      const day = new Date(m.created_at).getDay();
      if (day >= 0 && day <= 6) daysCount[day]++;
    }
  }
  
  const messagesByDay = daysCount.map((count, day) => ({ day, count }));
  const conversationBalance = { inbound, outbound };

  // ── Recent Campaigns ─────────────────────────────────────────────────────
  const recentCampaigns = [...(campaigns || [])]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6)
    .map(c => ({
      campaign_name: c.campaign_name || "Unnamed Campaign",
      status: c.status || "DRAFT",
      total_recipients: c.total_recipients || 0,
      sent_count: c.sent_count || 0,
      delivered_count: c.delivered_count || 0,
      read_count: c.read_count || 0,
      replied_count: c.replied_count || 0,
      created_at: c.created_at || new Date().toISOString(),
    }));

  // ── Plan check ───────────────────────────────────────────────────────────
  const servicePlan = (profile as any)?.service_plan?.toLowerCase() || "free";
  const isPaid = servicePlan === "pastor_brand" || servicePlan === "pastor brand";

  const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/V2V5DL6EBYTGW";

  const planFeatures = [
    "AI Pastoral Assistant — 24/7 responses",
    "WhatsApp Integration & Mass Campaigns",
    "Unlimited Contacts & Team Members",
    "Smart Lead Management Dashboard",
  ];

  // ── Stat cards ───────────────────────────────────────────────────────────
  const stats = [
    {
      id: "flock",
      title: "Congregation Size",
      subtitle: "People in your care",
      value: totalMembers ?? 0,
      icon: Users,
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      badge: "Total",
      badgeColor: "text-blue-500",
    },
    {
      id: "conversations",
      title: "Active Conversations",
      subtitle: "Open WhatsApp threads",
      value: totalConversations ?? 0,
      icon: MessageCircle,
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
      badge: "Live",
      badgeColor: "text-orange-500",
    },
    {
      id: "replied",
      title: "Members Responded",
      subtitle: "Replied to your outreach",
      value: campaignStats.replied,
      icon: Heart,
      lightColor: "bg-pink-50",
      textColor: "text-pink-600",
      badge: "Engaged",
      badgeColor: "text-pink-500",
    },
    {
      id: "campaigns",
      title: "Campaigns Launched",
      subtitle: "Outreach missions sent",
      value: totalCampaigns ?? 0,
      icon: Megaphone,
      lightColor: "bg-purple-50",
      textColor: "text-purple-600",
      badge: "Sent",
      badgeColor: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your ministry at a glance — faithfully tracked, clearly shown.</p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.id} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.lightColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${stat.badgeColor}`}>
                <ArrowUpRight className="w-3 h-3" />
                {stat.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-0.5">{stat.value.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-700">{stat.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.subtitle}</div>
          </div>
        ))}
      </div>

      {/* ── Analytics + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardInsights
            visitorStages={visitorStages}
            messagesByDay={messagesByDay}
            conversationBalance={conversationBalance}
            recentCampaigns={recentCampaigns}
          />
        </div>
        <div>
          <RecentActivity recentMembers={recentLeads ?? []} />
        </div>
      </div>

      {/* ── Plan Card ── */}
      {isPaid ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="brand-gradient px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Pastor Brand Plan</h3>
                <p className="text-gray-300 text-sm">Your active subscription</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">Active</span>
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0 text-center md:text-left md:pr-6 md:border-r md:border-gray-100">
              <div className="flex items-end gap-1 justify-center md:justify-start">
                <span className="text-4xl font-extrabold text-gray-900">$49</span>
                <span className="text-gray-500 text-sm font-medium mb-1">/month</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Billed monthly via PayPal</p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-orange-600 stroke-[3]" />
                  </div>
                  <span className="text-gray-600 text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-xl hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="brand-gradient px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Unlock Pastor Brand</h3>
                <p className="text-gray-300 text-sm">You are on the Free plan — upgrade to access everything</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">Free</span>
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0 text-center md:text-left md:pr-6 md:border-r md:border-gray-100">
              <div className="flex items-end gap-1 justify-center md:justify-start">
                <span className="text-4xl font-extrabold text-gray-900">$49</span>
                <span className="text-gray-500 text-sm font-medium mb-1">/month</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Billed monthly via PayPal</p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-orange-600 stroke-[3]" />
                  </div>
                  <span className="text-gray-600 text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2">
              <a
                href={PAYPAL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 orange-gradient text-white font-semibold py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4" />
                Subscribe via PayPal
              </a>
              <p className="text-center text-xs text-gray-400">Secure • Cancel anytime</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
