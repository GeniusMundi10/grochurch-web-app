import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Briefcase, Users, TrendingUp, CheckCircle, Plus } from "lucide-react";

export default async function ServicesPage() {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("service_subscriptions")
    .select("*, profile:profiles(full_name, email, church_name, role)")
    .order("created_at", { ascending: false });

  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter((s) => s.status === "active").length || 0,
    rescue: subscriptions?.filter((s) => s.plan === "rescue" && s.status === "active").length || 0,
    thrive: subscriptions?.filter((s) => s.plan === "thrive" && s.status === "active").length || 0,
    monthlyRevenue: subscriptions
      ?.filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.amount, 0) || 0,
  };

  const PLAN_INFO = {
    donation: { label: "Donation", color: "bg-gray-100 text-gray-700", price: "Flexible" },
    rescue: { label: "Rescue Plan", color: "bg-blue-100 text-blue-700", price: "$500/mo" },
    thrive: { label: "Thrive Plan", color: "bg-orange-100 text-orange-700", price: "$1,000/mo" },
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    paused: "bg-yellow-100 text-yellow-700",
    trial: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services & Plans</h1>
          <p className="text-gray-500 mt-1">Manage service subscriptions and pastoral care plans</p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Subscriptions</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500 mt-1">Active</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.rescue}</div>
          <div className="text-xs text-gray-500 mt-1">Rescue Plans</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{stats.thrive}</div>
          <div className="text-xs text-gray-500 mt-1">Thrive Plans</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">Monthly Revenue</div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Donation Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Donation</h3>
          <div className="text-orange-600 font-bold text-xl mt-1">Flexible</div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Support the mission</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Pure giving model</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Direct impact on pastoral health</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {subscriptions?.filter((s) => s.plan === "donation").length || 0} subscribers
            </div>
          </div>
        </div>

        {/* Rescue Plan */}
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Rescue Plan</h3>
          <div className="text-orange-600 font-bold text-xl mt-1">$500/mo</div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Monthly 1:1 Pastoral Support Call</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Crisis Triage & Messaging Support</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Sermon & Communication Architecture</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Access to Core Pastors@Risk™ Tools</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {subscriptions?.filter((s) => s.plan === "rescue" && s.status === "active").length || 0} active subscribers
            </div>
          </div>
        </div>

        {/* Thrive Plan */}
        <div className="bg-brand-navy rounded-xl p-6 text-white">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Thrive Plan</h3>
          <div className="text-orange-400 font-bold text-xl mt-1">$1,000/mo</div>
          <ul className="mt-4 space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" /> Weekly Founder-Grade Coaching</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" /> Full Messaging & Outreach Strategy</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" /> Church Systems & Staff Direction</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" /> Custom 90-Day & 12-Month Plans</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-sm text-gray-400">
              {subscriptions?.filter((s) => s.plan === "thrive" && s.status === "active").length || 0} active subscribers
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Member</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Start Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscriptions?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">No subscriptions yet</td>
                </tr>
              ) : (
                subscriptions?.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-semibold">
                          {sub.profile ? getInitials(sub.profile.full_name) : "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{sub.profile?.full_name || "Unknown"}</div>
                          <div className="text-xs text-gray-400">{sub.profile?.church_name || sub.profile?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLAN_INFO[sub.plan as keyof typeof PLAN_INFO]?.color || "bg-gray-100 text-gray-600"}`}>
                        {PLAN_INFO[sub.plan as keyof typeof PLAN_INFO]?.label || sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(sub.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status] || "bg-gray-100 text-gray-600"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(sub.start_date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 capitalize">{sub.billing_cycle}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
