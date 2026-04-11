"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { getInitials } from "@/lib/utils";
import { Bell, LogOut, User, Settings, ChevronDown, Sparkles, Menu } from "lucide-react";
import { useCrmAssistant } from "@/context/CrmAssistantContext";
import { useSidebar } from "@/context/SidebarContext";
import Link from "next/link";

interface TopBarProps {
  profile: Profile | null;
}

export default function TopBar({ profile }: TopBarProps) {
  const router = useRouter();
  const { toggle } = useCrmAssistant();
  const { toggleSidebar, isMobile } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-20">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-sm text-gray-500">
            Welcome back,{" "}
            <span className="font-semibold text-gray-900">
              {profile?.full_name?.split(" ")[0] || "Pastor"}
            </span>
          </h2>
          {profile?.church_name && (
            <p className="text-xs text-gray-400">{profile.church_name}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* PROF! Assistant */}
        <button 
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all font-medium text-xs shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Ask PROF!
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
        </button>

        {/* Plan badge */}
        {profile?.service_plan && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            profile.service_plan === "thrive"
              ? "bg-orange-100 text-orange-700"
              : profile.service_plan === "rescue"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {profile.service_plan === "thrive" ? "Thrive Plan" : profile.service_plan === "rescue" ? "Rescue Plan" : "Donor"}
          </span>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {profile ? getInitials(profile.full_name) : "U"}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900 text-sm">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                  {profile?.role === "admin" && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    My Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
