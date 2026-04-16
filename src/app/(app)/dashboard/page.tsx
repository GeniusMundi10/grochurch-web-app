import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import RecentActivity from "@/components/dashboard/RecentActivity";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Check,
  CreditCard,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return <div>User not found or unauthenticated.</div>;
  }

  // Use admin client to bypass RLS for dashboard stats
  const admin = createAdminClient();

  const [
    { count: totalMembers },
    { count: totalContacted },
    { count: totalResponded },
    { data: recentMembers },
  ] = await Promise.all([
    admin.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("wa_conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("wa_conversations").select("*", { count: "exact", head: true }).eq("user_id", user.id).gt("unread_count", 0),
    admin.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    {
      title: "Total Members",
      value: totalMembers || 0,
      icon: Users,
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      change: "Active",
      positive: true,
    },
    {
      title: "People Contacted",
      value: totalContacted || 0,
      icon: MessageSquare,
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
      change: "Reach",
      positive: true,
    },
    {
      title: "Responded",
      value: totalResponded || 0,
      icon: TrendingUp,
      lightColor: "bg-green-50",
      textColor: "text-green-600",
      change: "Engagement",
      positive: true,
    },
  ];

  const planFeatures = [
    "AI Pastoral Assistant — 24/7 responses",
    "WhatsApp Integration & Mass Campaigns",
    "Unlimited Contacts & Team Members",
    "Smart Lead Management Dashboard",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your GroChurch ministry platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.lightColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.title}</div>
          </div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts />
        </div>
        <div>
          <RecentActivity recentMembers={recentMembers || []} />
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Gradient header */}
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
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
            Active
          </span>
        </div>

        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          {/* Price block */}
          <div className="flex-shrink-0 text-center md:text-left md:pr-6 md:border-r md:border-gray-100">
            <div className="flex items-end gap-1 justify-center md:justify-start">
              <span className="text-4xl font-extrabold text-gray-900">$49</span>
              <span className="text-gray-500 text-sm font-medium mb-1">/month</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Billed monthly via PayPal</p>
          </div>

          {/* Features */}
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

          {/* CTA */}
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
    </div>
  );
}
