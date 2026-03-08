"use client";

import { useState } from "react";
import { Profile } from "@/types";
import { getInitials, formatDateShort } from "@/lib/utils";
import { Search, Filter, MoreHorizontal, Mail, Phone, Edit, Trash2, Eye } from "lucide-react";
import Link from "next/link";

interface MembersTableProps {
  members: Profile[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  pastor: "bg-orange-100 text-orange-700",
  member: "bg-blue-100 text-blue-700",
  donor: "bg-green-100 text-green-700",
};

const PLAN_COLORS: Record<string, string> = {
  thrive: "bg-orange-100 text-orange-700",
  rescue: "bg-blue-100 text-blue-700",
  donation: "bg-gray-100 text-gray-600",
};

export default function MembersTable({ members }: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.church_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const matchesPlan = planFilter === "all" || m.service_plan === planFilter;
    return matchesSearch && matchesRole && matchesPlan;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="pastor">Pastor</option>
            <option value="member">Member</option>
            <option value="donor">Donor</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="all">All Plans</option>
            <option value="thrive">Thrive</option>
            <option value="rescue">Rescue</option>
            <option value="donation">Donation</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Church</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No members found
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-semibold flex-shrink-0">
                        {getInitials(member.full_name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{member.full_name}</div>
                        <div className="text-xs text-gray-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{member.church_name || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600"}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {member.service_plan ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[member.service_plan] || "bg-gray-100 text-gray-600"}`}>
                        {member.service_plan}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${member.is_active ? "text-green-600" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{formatDateShort(member.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`mailto:${member.email}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Mail className="w-4 h-4" />
                      </a>
                      <Link href={`/members/${member.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link href={`/members/${member.id}/edit`} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">
          Showing {filtered.length} of {members.length} members
        </p>
      </div>
    </div>
  );
}
