"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Profile } from "@/types";
import {
  LayoutDashboard,
  Users,
  Heart,
  Briefcase,
  Calendar,
  MessageSquare,
  HandHeart,
  Settings,
  Shield,
  ExternalLink,
  ChevronRight,
  Megaphone,
  Send,
  Plug2,
} from "lucide-react";

interface SidebarProps {
  profile: Profile | null;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/members", icon: Users, label: "Members" },
  { href: "/donations", icon: Heart, label: "Donations" },
  { href: "/services", icon: Briefcase, label: "Services" },
  { href: "/events", icon: Calendar, label: "Events" },
  { href: "/prospects", icon: Users, label: "Prospects/Leads" },
  { href: "/messages/live-chat", icon: MessageSquare, label: "Live Chat" },
  { href: "/messages/whatsapp-templates", icon: Megaphone, label: "WA Templates" },
  { href: "/messages/whatsapp-campaigns", icon: Send, label: "WA Campaigns" },
  { href: "/integrations", icon: Plug2, label: "Integrations" },
  { href: "/prayer-requests", icon: HandHeart, label: "Prayer Requests" },
];

const adminItems = [
  { href: "/admin", icon: Shield, label: "Admin Panel" },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 brand-gradient flex flex-col h-full shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">GroChurch</div>
            <div className="text-orange-300 text-xs">Pastors@Risk™</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}

        {profile?.role === "admin" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3 mt-6">
              Administration
            </div>
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            pathname.startsWith("/settings")
              ? "bg-orange-500 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <a
          href="https://grochurch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <ExternalLink className="w-5 h-5" />
          grochurch.com
        </a>
      </div>
    </aside>
  );
}
