import { getInitials } from "@/lib/utils";
import { UserPlus, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Lead {
  id: string;
  name: string | null;
  phone?: string | null;
  source?: string | null;
  status: string;
  created_at: string;
}

interface RecentActivityProps {
  recentMembers: Lead[];
}

const statusLabel: Record<string, { text: string; color: string }> = {
  new_visitor:       { text: "New Visitor",       color: "bg-blue-100 text-blue-700" },
  returning_visitor: { text: "Returning",          color: "bg-green-100 text-green-700" },
  interested:        { text: "Interested",          color: "bg-amber-100 text-amber-700" },
  contacted:         { text: "Contacted",           color: "bg-purple-100 text-purple-700" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function RecentActivity({ recentMembers }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Recent Visitors</h3>
        </div>
        <Link
          href="/members"
          className="text-xs text-orange-600 hover:underline font-medium flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-2 flex-1">
        {recentMembers.length > 0 ? (
          recentMembers.slice(0, 6).map((member) => {
            const label = statusLabel[member.status] ?? { text: member.status, color: "bg-gray-100 text-gray-600" };
            const initials = getInitials(member.name || "?");
            const colors = [
              "bg-blue-100 text-blue-700",
              "bg-orange-100 text-orange-700",
              "bg-green-100 text-green-700",
              "bg-purple-100 text-purple-700",
            ];
            const avatarColor = colors[initials.charCodeAt(0) % colors.length];

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}>
                  {initials}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name || "Unknown Visitor"}
                  </p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${label.color}`}>
                    {label.text}
                  </span>
                </div>

                {/* Time */}
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(member.created_at)}</span>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-8">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">No visitors yet</p>
            <p className="text-xs text-gray-300 mt-1 text-center">
              Import your congregation list to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
