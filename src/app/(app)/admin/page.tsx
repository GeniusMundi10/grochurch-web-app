import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Shield, Users, Heart, TrendingUp, Database, Settings, Download, RefreshCw } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const [
    { count: totalUsers },
    { count: totalDonations },
    { data: recentActivity },
    { data: topDonors },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("donations").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("profiles").select("full_name, email, role, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("donations").select("user_id, amount, profile:profiles(full_name, church_name)").eq("status", "completed").order("amount", { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm">System administration and oversight</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalUsers}</div>
              <div className="text-xs text-gray-500">Total Users</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalDonations}</div>
              <div className="text-xs text-gray-500">Donations</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">v1.0</div>
              <div className="text-xs text-gray-500">App Version</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">Live</div>
              <div className="text-xs text-gray-500">DB Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Registrations</h3>
            <Link href="/members" className="text-xs text-orange-600 hover:text-orange-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity?.map((user) => (
              <div key={user.email} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{user.full_name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "admin" ? "bg-red-100 text-red-700" :
                    user.role === "pastor" ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateShort(user.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Admin Actions</h3>
          <div className="space-y-3">
            <Link
              href="/members"
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Manage Members</div>
                <div className="text-xs text-gray-500">View, edit, and manage all members</div>
              </div>
            </Link>
            <Link
              href="/donations"
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Donation Reports</div>
                <div className="text-xs text-gray-500">View and export donation data</div>
              </div>
            </Link>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm">Export All Data</div>
                <div className="text-xs text-gray-500">Download complete CRM data as CSV</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm">Sync Database</div>
                <div className="text-xs text-gray-500">Refresh all cached data</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
