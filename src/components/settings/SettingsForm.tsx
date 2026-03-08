"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { User, Church, Phone, MapPin, Save, Loader2, Lock, Bell } from "lucide-react";

interface SettingsFormProps {
  profile: Profile | null;
}

export default function SettingsForm({ profile }: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications">("profile");
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    church_name: profile?.church_name || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    city: profile?.city || "",
    state: profile?.state || "",
    website: profile?.website || "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update(formData)
      .eq("id", profile?.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "security" as const, label: "Security", icon: Lock },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="lg:col-span-3">
        {activeTab === "profile" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
                  <div className="relative">
                    <Church className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="church_name"
                      value={formData.church_name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://yourchurch.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Tell us about yourself and your ministry..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1">Email Address</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1">Password</h3>
                <p className="text-sm text-gray-500 mb-3">Last changed: Unknown</p>
                <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  Change Password
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
                <button className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { label: "New Donation Received", desc: "Get notified when a donation is made", defaultOn: true },
                { label: "New Member Joined", desc: "Get notified when a new member signs up", defaultOn: true },
                { label: "Prayer Request Submitted", desc: "Get notified of new prayer requests", defaultOn: false },
                { label: "Event Reminders", desc: "Reminders for upcoming events", defaultOn: true },
                { label: "Weekly Summary", desc: "Weekly digest of activity", defaultOn: true },
              ].map((notif) => (
                <div key={notif.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{notif.label}</h3>
                    <p className="text-xs text-gray-500">{notif.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={notif.defaultOn} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
