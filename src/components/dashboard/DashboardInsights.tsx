"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users,
  UserCheck,
  ZapIcon,
  PhoneCall,
  ArrowRight,
  MessageSquare,
  Bot,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Megaphone,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface VisitorStage {
  status: string;
  count: number;
}

interface DayActivity {
  day: number; // 0=Sun, 6=Sat
  count: number;
}

interface Campaign {
  campaign_name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  created_at: string;
}

interface DashboardInsightsProps {
  visitorStages: VisitorStage[];
  messagesByDay: DayActivity[];
  conversationBalance: { inbound: number; outbound: number };
  recentCampaigns: Campaign[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STAGE_PIPELINE = [
  {
    status: "new_visitor",
    label: "New Visitors",
    sublabel: "Just discovered your church",
    icon: Users,
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    borderColor: "border-blue-200",
    tip: "Send a warm welcome via WhatsApp",
  },
  {
    status: "returning_visitor",
    label: "Returning",
    sublabel: "Showing consistent interest",
    icon: UserCheck,
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
    borderColor: "border-orange-200",
    tip: "Invite to a community group",
  },
  {
    status: "interested",
    label: "Interested",
    sublabel: "Engaged with ministry content",
    icon: ZapIcon,
    color: "bg-amber-500",
    lightColor: "bg-amber-50",
    textColor: "text-amber-600",
    borderColor: "border-amber-200",
    tip: "Share discipleship resources",
  },
  {
    status: "contacted",
    label: "Contacted",
    sublabel: "In conversation with you",
    icon: PhoneCall,
    color: "bg-green-500",
    lightColor: "bg-green-50",
    textColor: "text-green-600",
    borderColor: "border-green-200",
    tip: "Invite to next steps & membership",
  },
];

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

function campaignDateAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CAMPAIGN_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  COMPLETED: { label: "Completed",  icon: CheckCircle2, color: "text-green-600" },
  SENDING:   { label: "Sending",    icon: Timer,        color: "text-orange-500" },
  SCHEDULED: { label: "Scheduled",  icon: Clock,        color: "text-blue-500" },
  STOPPED:   { label: "Stopped",    icon: XCircle,      color: "text-red-500" },
  DRAFT:     { label: "Draft",      icon: AlertCircle,  color: "text-gray-400" },
};

const CustomDayTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-orange-600 font-bold mt-1">{payload[0].value} messages</p>
      </div>
    );
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function DashboardInsights({
  visitorStages,
  messagesByDay,
  conversationBalance,
  recentCampaigns,
}: DashboardInsightsProps) {
  // Count per stage
  const stageMap: Record<string, number> = {};
  for (const s of visitorStages) stageMap[s.status] = s.count;
  const totalVisitors = visitorStages.reduce((s, v) => s + v.count, 0);

  // Find peak day
  const maxDay = messagesByDay.reduce((m, d) => (d.count > m.count ? d : m), { day: 0, count: 0 });
  const peakLabel = DAY_LABELS[maxDay.day];

  // Conversation health
  const { inbound, outbound } = conversationBalance;
  const totalMsgs = inbound + outbound;
  const ratio = outbound > 0 ? (inbound / outbound) : 0;
  const healthScore = Math.min(100, Math.round(ratio * 100));

  // Day chart data
  const dayData = messagesByDay.map((d) => ({
    day: DAY_LABELS[d.day],
    messages: d.count,
  }));

  return (
    <div className="space-y-6">

      {/* ━━ 1. Visitor Journey Pipeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Visitor Journey Pipeline</h3>
            <p className="text-xs text-gray-400 mt-0.5">Move people from first visit to faithful members</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {totalVisitors.toLocaleString()} total
          </span>
        </div>

        {/* Pipeline stages */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGE_PIPELINE.map((stage, idx) => {
            const StageIcon = stage.icon;
            const count = stageMap[stage.status] ?? 0;
            const pctOfTotal = pct(count, totalVisitors);

            return (
              <div key={stage.status} className="relative">
                <div className={`rounded-xl border ${stage.borderColor} p-4 h-full flex flex-col`}>
                  {/* Icon + count */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 ${stage.lightColor} rounded-lg flex items-center justify-center`}>
                      <StageIcon className={`w-4 h-4 ${stage.textColor}`} />
                    </div>
                    <span className={`text-2xl font-extrabold ${stage.textColor}`}>
                      {count.toLocaleString()}
                    </span>
                  </div>

                  {/* Label */}
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{stage.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{stage.sublabel}</p>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`${stage.color} h-1.5 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(pctOfTotal, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pctOfTotal}% of congregation</p>

                  {/* Tip */}
                  <p className={`text-xs ${stage.textColor} font-medium mt-2 pt-2 border-t ${stage.borderColor}`}>
                    💡 {stage.tip}
                  </p>
                </div>

                {/* Arrow between stages */}
                {idx < STAGE_PIPELINE.length - 1 && (
                  <div className="hidden lg:flex absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 w-3 h-3 items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━ 2. Two-column: Peak Day + Conversation Health ━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── When Your Flock Engages ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">When Your Flock Engages</h3>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-semibold text-orange-600">Peak: {peakLabel}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Best day to send campaigns for maximum response
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayData} barSize={28}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomDayTooltip />} cursor={{ fill: "#fef3ec" }} />
              <Bar dataKey="messages" radius={[5, 5, 0, 0]}>
                {dayData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.day === peakLabel ? "#f97316" : "#fed7aa"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-gray-400 mt-2">
            📅 Schedule your next campaign on <span className="font-semibold text-gray-700">{peakLabel}</span> for best results
          </p>
        </div>

        {/* ── Conversation Health Score ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">Conversation Health</h3>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                healthScore >= 70
                  ? "bg-green-50 text-green-600"
                  : healthScore >= 40
                  ? "bg-amber-50 text-amber-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  healthScore >= 70 ? "bg-green-500" : healthScore >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
              />
              {healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "Low"}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            How well your AI pastoral assistant maintains two-way conversations
          </p>

          {/* Score ring / visual */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={healthScore >= 70 ? "#22c55e" : healthScore >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${healthScore} ${100 - healthScore}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-gray-900">{healthScore}%</span>
                <span className="text-xs text-gray-400">balance</span>
              </div>
            </div>
          </div>

          {/* Inbound vs Outbound bars */}
          <div className="space-y-3 flex-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">AI Sent (Outreach)</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{outbound}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-orange-400 h-2 rounded-full"
                  style={{ width: `${pct(outbound, totalMsgs)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Congregation Replied</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{inbound}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full"
                  style={{ width: `${pct(inbound, totalMsgs)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4 pt-3 border-t border-gray-100">
            {healthScore >= 70
              ? "✅ Your congregation is actively engaging in conversation"
              : "⚠️ Try personalizing messages to encourage more replies"}
          </p>
        </div>
      </div>

      {/* ━━ 3. Recent Campaigns Spotlight ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Campaign Spotlight</h3>
            <p className="text-xs text-gray-400 mt-0.5">Performance of your most recent outreach missions</p>
          </div>
          <a href="/message-templates" className="text-xs text-orange-600 hover:underline font-medium">
            View all →
          </a>
        </div>

        {recentCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">Campaign</th>
                  <th className="text-center text-xs font-medium text-gray-400 pb-3 px-2">Status</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-2">Reached</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-2">Delivered</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-2">Read</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 pl-2">Replied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentCampaigns.map((c, i) => {
                  const s = CAMPAIGN_STATUS[c.status] ?? CAMPAIGN_STATUS["DRAFT"];
                  const StatusIcon = s.icon;
                  const delivPct = pct(c.delivered_count, c.total_recipients);
                  const readPct = pct(c.read_count, c.total_recipients);
                  const replyPct = pct(c.replied_count, c.total_recipients);

                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {/* Name + date */}
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-gray-800 truncate max-w-[160px]">{c.campaign_name}</p>
                        <p className="text-xs text-gray-400">{campaignDateAgo(c.created_at)}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>

                      {/* Metrics */}
                      <td className="py-3.5 px-2 text-right">
                        <span className="font-semibold text-gray-800">{c.total_recipients}</span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <span className={`font-medium ${delivPct >= 80 ? "text-green-600" : delivPct >= 40 ? "text-amber-600" : "text-gray-400"}`}>
                          {delivPct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <span className={`font-medium ${readPct >= 50 ? "text-green-600" : readPct >= 20 ? "text-amber-600" : "text-gray-400"}`}>
                          {readPct}%
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <span className={`font-medium ${replyPct >= 10 ? "text-green-600" : "text-gray-400"}`}>
                          {replyPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Megaphone className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No campaigns sent yet</p>
            <a href="/send-campaign" className="text-xs text-orange-600 font-medium mt-1 hover:underline">
              Create your first campaign →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


