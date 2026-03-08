import { createClient } from "@/lib/supabase/server";
import DonationsTable from "@/components/donations/DonationsTable";
import DonationStats from "@/components/donations/DonationStats";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function DonationsPage() {
  const supabase = await createClient();

  const { data: donations } = await supabase
    .from("donations")
    .select("*, profile:profiles(full_name, email, church_name)")
    .order("created_at", { ascending: false });

  // Calculate stats
  const now = new Date();
  const thisMonth = donations?.filter((d) => {
    const date = new Date(d.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }) || [];

  const lastMonth = donations?.filter((d) => {
    const date = new Date(d.created_at);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
  }) || [];

  const stats = {
    totalAll: donations?.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0) || 0,
    totalThisMonth: thisMonth.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0) || 0,
    totalLastMonth: lastMonth.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0) || 0,
    totalCount: donations?.length || 0,
    completedCount: donations?.filter((d) => d.status === "completed").length || 0,
    pendingCount: donations?.filter((d) => d.status === "pending").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
          <p className="text-gray-500 mt-1">Track and manage all donations to GroChurch</p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Record Donation
        </button>
      </div>

      <DonationStats stats={stats} />
      <DonationsTable donations={donations || []} />
    </div>
  );
}
