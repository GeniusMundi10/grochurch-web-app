import { formatDateShort, getInitials } from "@/lib/utils";
import { UserPlus } from "lucide-react";

interface RecentActivityProps {
  recentMembers: Array<{
    id: string;
    full_name: string;
    church_name?: string;
    created_at: string;
    role: string;
  }>;
}

export default function RecentActivity({ recentMembers }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

      <div className="space-y-4">
        {/* Recent Members */}
        {recentMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">New Members</span>
            </div>
            <div className="space-y-2">
              {recentMembers.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
                    {getInitials(member.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.church_name || member.role}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDateShort(member.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentMembers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
