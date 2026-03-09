import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { Calendar, MapPin, Video, Users, Plus, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const admin = createAdminClient();

  const { data: events } = await admin
    .from("events")
    .select("*, attendees:event_attendees(count)")
    .order("event_date", { ascending: true });

  const upcoming = events?.filter((e) => e.status === "upcoming") || [];
  const past = events?.filter((e) => e.status === "completed") || [];

  const STATUS_COLORS: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    ongoing: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Manage coaching sessions, webinars, and ministry events</p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
          <div className="text-xs text-gray-500 mt-1">Upcoming</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-gray-600">{past.length}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-orange-600">{events?.filter((e) => e.is_virtual).length || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Virtual</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-bold text-gray-900">{events?.length || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Events</div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((event) => (
              <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                    {event.status}
                  </span>
                  {event.is_virtual && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      <Video className="w-3 h-3" />
                      Virtual
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                {event.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    {formatDate(event.event_date)}
                  </div>
                  {event.event_time && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      {event.event_time}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      {event.location}
                    </div>
                  )}
                  {event.max_attendees && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      Max {event.max_attendees} attendees
                    </div>
                  )}
                </div>
                {event.meeting_link && (
                  <a
                    href={event.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    Join Meeting
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Events Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">No events yet</td>
                </tr>
              ) : (
                events?.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{event.title}</div>
                      {event.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{event.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{formatDate(event.event_date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${event.is_virtual ? "text-blue-600" : "text-gray-600"}`}>
                        {event.is_virtual ? <><Video className="w-3 h-3" /> Virtual</> : <><MapPin className="w-3 h-3" /> In-Person</>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{event.location || (event.is_virtual ? "Online" : "—")}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
