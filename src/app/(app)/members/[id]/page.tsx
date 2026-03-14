import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Edit } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!member) notFound();



  const { data: subscription } = await admin
    .from("service_subscriptions")
    .select("*")
    .eq("user_id", id)
    .eq("status", "active")
    .single();



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/members" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Profile</h1>
          <p className="text-gray-500 text-sm">View and manage member details</p>
        </div>
        <div className="ml-auto">
          <Link
            href={`/members/${id}/edit`}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-2xl font-bold mx-auto mb-3">
                {getInitials(member.full_name)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{member.full_name}</h2>
              <p className="text-gray-500 text-sm">{member.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  member.role === "admin" ? "bg-red-100 text-red-700" :
                  member.role === "pastor" ? "bg-orange-100 text-orange-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {member.role}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${member.is_active ? "text-green-600" : "text-gray-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  {member.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {member.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{member.phone}</span>
                </div>
              )}

              {(member.city || member.state) && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{[member.city, member.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-4 h-4 flex items-center justify-center text-[10px] font-bold">📅</span>
                <span className="text-gray-600">Joined {formatDate(member.created_at)}</span>
              </div>
            </div>

            {member.bio && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
              </div>
            )}
          </div>

          {/* Service Plan */}
          {subscription && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Current Plan</h3>
              <div className={`rounded-xl p-4 ${
                subscription.plan === "thrive" ? "bg-orange-50 border border-orange-200" :
                subscription.plan === "rescue" ? "bg-blue-50 border border-blue-200" :
                "bg-gray-50 border border-gray-200"
              }`}>
                <div className="font-bold text-gray-900 capitalize">{subscription.plan} Plan</div>
                <div className="text-orange-600 font-semibold">{formatCurrency(subscription.amount)}/mo</div>
                <div className="text-xs text-gray-500 mt-1">Since {formatDate(subscription.start_date)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          {member.notes && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Admin Notes</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{member.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateShort(date: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}
