"use client";

import { useState } from "react";
import { formatCurrency, formatDateShort, getInitials } from "@/lib/utils";
import { Search, Download, Eye } from "lucide-react";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  profile?: { full_name: string; email: string; church_name?: string } | null;
}

interface DonationsTableProps {
  donations: Donation[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export default function DonationsTable({ donations }: DonationsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filtered = donations.filter((d) => {
    const matchesSearch =
      (d.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (d.profile?.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (d.transaction_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const date = new Date(d.created_at);
      const now = new Date();
      if (dateFilter === "this_month") {
        matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (dateFilter === "last_month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        matchesDate = date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
      } else if (dateFilter === "this_year") {
        matchesDate = date.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalFiltered = filtered.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0);

  const exportCSV = () => {
    const headers = ["Date", "Donor", "Church", "Amount", "Method", "Status", "Transaction ID"];
    const rows = filtered.map((d) => [
      formatDateShort(d.created_at),
      d.profile?.full_name || "Anonymous",
      d.profile?.church_name || "",
      d.amount,
      d.payment_method || "",
      d.status,
      d.transaction_id || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grochurch-donations.csv";
    a.click();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search donations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Donor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Transaction ID</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">No donations found</td>
              </tr>
            ) : (
              filtered.map((donation) => (
                <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-semibold flex-shrink-0">
                        {donation.profile ? getInitials(donation.profile.full_name) : "?"}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {donation.profile?.full_name || "Anonymous"}
                        </div>
                        <div className="text-xs text-gray-400">{donation.profile?.church_name || donation.profile?.email || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(donation.amount)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{donation.payment_method || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[donation.status] || "bg-gray-100 text-gray-600"}`}>
                      {donation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{formatDateShort(donation.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 font-mono">{donation.transaction_id || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Showing {filtered.length} of {donations.length} donations
        </p>
        <p className="text-xs font-semibold text-gray-700">
          Filtered Total: {formatCurrency(totalFiltered)}
        </p>
      </div>
    </div>
  );
}
