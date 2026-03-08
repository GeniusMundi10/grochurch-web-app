import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, CheckCircle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DonationStatsProps {
  stats: {
    totalAll: number;
    totalThisMonth: number;
    totalLastMonth: number;
    totalCount: number;
    completedCount: number;
    pendingCount: number;
  };
}

export default function DonationStats({ stats }: DonationStatsProps) {
  const monthChange = stats.totalLastMonth > 0
    ? ((stats.totalThisMonth - stats.totalLastMonth) / stats.totalLastMonth) * 100
    : 0;
  const isPositive = monthChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-xs text-gray-400">All time</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAll)}</div>
        <div className="text-sm text-gray-500 mt-1">Total Donations</div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(monthChange).toFixed(1)}%
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalThisMonth)}</div>
        <div className="text-sm text-gray-500 mt-1">This Month</div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xs text-gray-400">{stats.totalCount} total</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.completedCount}</div>
        <div className="text-sm text-gray-500 mt-1">Completed</div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <span className="text-xs text-gray-400">Needs attention</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
        <div className="text-sm text-gray-500 mt-1">Pending</div>
      </div>
    </div>
  );
}
