import { createClient } from "@/lib/supabase/server";
import { formatDateShort, getInitials } from "@/lib/utils";
import { HandHeart, CheckCircle, Clock, XCircle, Plus } from "lucide-react";

export default async function PrayerRequestsPage() {
  const supabase = await createClient();

  const { data: prayerRequests } = await supabase
    .from("prayer_requests")
    .select("*, profile:profiles(full_name, church_name)")
    .order("created_at", { ascending: false });

  const stats = {
    open: prayerRequests?.filter((p) => p.status === "open").length || 0,
    answered: prayerRequests?.filter((p) => p.status === "answered").length || 0,
    closed: prayerRequests?.filter((p) => p.status === "closed").length || 0,
    total: prayerRequests?.length || 0,
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    answered: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
  };

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    open: <Clock className="w-4 h-4 text-blue-500" />,
    answered: <CheckCircle className="w-4 h-4 text-green-500" />,
    closed: <XCircle className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prayer Requests</h1>
          <p className="text-gray-500 mt-1">Support and intercede for your pastoral community</p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Submit Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <HandHeart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">{stats.open}</div>
              <div className="text-xs text-gray-500">Open</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{stats.answered}</div>
              <div className="text-xs text-gray-500">Answered</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-500">{stats.closed}</div>
              <div className="text-xs text-gray-500">Closed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prayer Requests */}
      <div className="space-y-3">
        {prayerRequests?.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <HandHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No prayer requests yet</p>
          </div>
        ) : (
          prayerRequests?.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{STATUS_ICONS[request.status]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                        {request.status}
                      </span>
                      {request.is_anonymous && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{request.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      {!request.is_anonymous && request.profile && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-semibold">
                            {getInitials(request.profile.full_name)}
                          </div>
                          <span className="text-xs text-gray-500">{request.profile.full_name}</span>
                          {request.profile.church_name && (
                            <span className="text-xs text-gray-400">• {request.profile.church_name}</span>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{formatDateShort(request.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {request.status === "open" && (
                    <button className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors">
                      Mark Answered
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
