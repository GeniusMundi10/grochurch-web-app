import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import RecentActivity from "@/components/dashboard/RecentActivity";
import {
  Users,
  TrendingUp,
  MessageSquare,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.id) {
    return <div>User not found or unauthenticated.</div>; // Alternatively, redirect to login
  }

  // Use admin client to bypass RLS for dashboard stats
  const admin = createAdminClient();

  // Fetch stats using admin client, scoped to the current user's church
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
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      change: "Active",
      positive: true,
    },
    {
      title: "People Contacted",
      value: totalContacted || 0,
      icon: MessageSquare,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
      change: "Reach",
      positive: true,
    },
    {
      title: "Responded",
      value: totalResponded || 0,
      icon: TrendingUp,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      textColor: "text-green-600",
      change: "Engagement",
      positive: true,
    },
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
          <RecentActivity
            recentMembers={recentMembers || []}
          />
        </div>
      </div>

      {/* Service Plan Overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Plan Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Rescue Plan</div>
                <div className="text-orange-600 font-bold text-sm">$500/mo</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Monthly 1:1 support, crisis triage, sermon architecture</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Thrive Plan</div>
                <div className="text-orange-600 font-bold text-sm">$1,000/mo</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Weekly coaching, full strategy, custom 90-day plans</p>
          </div>
        </div>
      </div>
    </div>
  );
}
