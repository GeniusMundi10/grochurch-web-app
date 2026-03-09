import { createAdminClient } from "@/lib/supabase/admin";
import MembersTable from "@/components/members/MembersTable";
import { Users, UserPlus, UserCheck, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const admin = createAdminClient();

  const { data: members, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const stats = {
    total: members?.length || 0,
    pastors: members?.filter((m) => m.role === "pastor").length || 0,
    active: members?.filter((m) => m.is_active).length || 0,
    withPlan: members?.filter((m) => m.service_plan).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">Manage your GroChurch community members</p>
        </div>
        <a
          href="/members/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.pastors}</div>
              <div className="text-xs text-gray-500">Pastors</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.withPlan}</div>
              <div className="text-xs text-gray-500">On a Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <MembersTable members={members || []} />
    </div>
  );
}
