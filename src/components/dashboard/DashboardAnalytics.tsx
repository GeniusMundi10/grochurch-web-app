"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { Users, Send, CheckCheck, Eye, MessageCircle } from "lucide-react";

interface WeeklyDataPoint {
  week: string;
  contacts: number;
}

interface CampaignStats {
  totalReached: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
}

interface DashboardAnalyticsProps {
  weeklyGrowth: WeeklyDataPoint[];
  campaignStats: CampaignStats;
}

type Tab = "growth" | "outreach";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-orange-600 font-bold">{payload[0].value} new visitors</p>
      </div>
    );
  }
  return null;
};

export default function DashboardAnalytics({ weeklyGrowth, campaignStats }: DashboardAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("growth");

  const { totalReached, sent, delivered, read, replied } = campaignStats;

  const funnelSteps = [
    {
      label: "Reached",
      subLabel: "People your campaigns targeted",
      value: totalReached,
      icon: Users,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      pct: 100,
    },
    {
      label: "Delivered",
      subLabel: "Messages successfully received",
      value: delivered,
      icon: Send,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
      pct: totalReached > 0 ? Math.round((delivered / totalReached) * 100) : 0,
    },
    {
      label: "Opened",
      subLabel: "People who read your message",
      value: read,
      icon: Eye,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      textColor: "text-green-600",
      pct: totalReached > 0 ? Math.round((read / totalReached) * 100) : 0,
    },
    {
      label: "Replied",
      subLabel: "Congregation who responded",
      value: replied,
      icon: MessageCircle,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      textColor: "text-purple-600",
      pct: totalReached > 0 ? Math.round((replied / totalReached) * 100) : 0,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ministry Analytics</h3>
          <p className="text-xs text-gray-400 mt-0.5">Real-time insights from your congregation</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["growth", "outreach"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "growth" ? "Flock Growth" : "Outreach"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Flock Growth ── */}
      {activeTab === "growth" && (
        <div>
          {weeklyGrowth.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-4">
                New visitors added to your congregation each week
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyGrowth} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="contacts"
                    name="New Visitors"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-gray-400 mt-3">
                Total congregation: <span className="font-semibold text-gray-700">{weeklyGrowth.reduce((s, d) => s + d.contacts, 0)}</span> contacts
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Users className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No congregation data yet</p>
              <p className="text-xs text-gray-300 mt-1">Import or add members to see growth trends</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Outreach Funnel ── */}
      {activeTab === "outreach" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 mb-4">
            How far your outreach messages travel — from sent to conversation
          </p>
          {funnelSteps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className="relative">
                <div className="flex items-center gap-4">
                  {/* Step number + icon */}
                  <div className={`flex-shrink-0 w-9 h-9 ${step.lightColor} rounded-xl flex items-center justify-center`}>
                    <StepIcon className={`w-4 h-4 ${step.textColor}`} />
                  </div>

                  {/* Label + bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{step.label}</span>
                        <span className="text-xs text-gray-400 ml-2">{step.subLabel}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${step.textColor}`}>{step.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">({step.pct}%)</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${step.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(step.pct, step.value > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Connector arrow */}
                {index < funnelSteps.length - 1 && (
                  <div className="ml-4 mt-1 mb-0.5 w-0.5 h-3 bg-gray-200 rounded" />
                )}
              </div>
            );
          })}

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Based on <strong className="text-gray-700">{sent > 0 ? sent : totalReached} messages</strong> sent across all campaigns</span>
            <a href="/messages" className="text-orange-600 hover:underline font-medium">
              See campaigns →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
