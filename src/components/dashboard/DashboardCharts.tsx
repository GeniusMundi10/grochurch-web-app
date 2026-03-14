"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useState } from "react";

const monthlyData = [
  { month: "Aug", members: 45 },
  { month: "Sep", members: 52 },
  { month: "Oct", members: 58 },
  { month: "Nov", members: 63 },
  { month: "Dec", members: 71 },
  { month: "Jan", members: 78 },
  { month: "Feb", members: 85 },
  { month: "Mar", members: 92 },
];

const planData = [
  { plan: "Rescue", count: 28, revenue: 14000 },
  { plan: "Thrive", count: 15, revenue: 15000 },
];

type TabType = "members" | "plans";

export default function DashboardCharts() {
  const [activeTab, setActiveTab] = useState<TabType>("members");

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["members", "plans"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "members" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Member growth (last 8 months)</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [Number(value), "Members"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Area
                type="monotone"
                dataKey="members"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#memberGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "plans" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Revenue by service plan</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={planData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="plan" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue ($)" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="count" name="Members" fill="#1a2332" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
