"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Profile } from "@/types";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  HandHeart,
  Settings,
  Shield,
  ExternalLink,
  ChevronRight,
  FileText,
  Send,
  Plug2,
  Bot,
} from "lucide-react";

interface SidebarProps {
  profile: Profile | null;
}

interface NavSection {
  title: string;
  items: { href: string; icon: any; label: string }[];
}

const navSections: NavSection[] = [
  {
    title: "Ministry",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/prospects", icon: Users, label: "My Congregation" },
      { href: "/prayer-requests", icon: HandHeart, label: "Prayer Requests" },
    ],
  },
  {
    title: "Outreach",
    items: [
      { href: "/messages/live-chat", icon: MessageSquare, label: "Conversations" },
      { href: "/messages/whatsapp-templates", icon: FileText, label: "Message Templates" },
      { href: "/messages/whatsapp-campaigns", icon: Send, label: "Send Campaign" },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/ai-assistant", icon: Bot, label: "AI Assistant" },
      { href: "/integrations", icon: Plug2, label: "Integrations" },
    ],
  },
];

const adminItems = [
  { href: "/admin", icon: Shield, label: "Admin Panel" },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 brand-gradient flex flex-col h-full shadow-xl relative overflow-hidden">
      {/* Subtle cross watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
        <svg viewBox="0 0 100 120" className="w-48 h-48" fill="white">
          <rect x="38" y="0" width="24" height="120" rx="4" />
          <rect x="10" y="28" width="80" height="24" rx="4" />
        </svg>
      </div>

      {/* Logo */}
      <div className="p-6 border-b border-white/10 relative z-10">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <rect x="10.5" y="2" width="3" height="20" rx="1" />
              <rect x="5" y="7" width="14" height="3" rx="1" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight tracking-tight">GroChurch</div>
            <div className="text-orange-300/80 text-[10px] font-semibold uppercase tracking-widest">Pastors@Risk™</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto relative z-10">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-bold text-orange-400/60 uppercase tracking-[0.15em] px-3 mb-2">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-300/90 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[18px] h-[18px] flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400"
                    )} />
                    <span className="truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {profile?.role === "admin" && (
          <div>
            <div className="text-[10px] font-bold text-orange-400/60 uppercase tracking-[0.15em] px-3 mb-2">
              Administration
            </div>
            <div className="space-y-0.5">
              {adminItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-300/90 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <item.icon className={cn(
                      "w-[18px] h-[18px] flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400"
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/8 space-y-1 relative z-10">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
            pathname.startsWith("/settings")
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
              : "text-gray-300/90 hover:bg-white/8 hover:text-white"
          )}
        >
          <Settings className="w-[18px] h-[18px]" />
          Settings
        </Link>
        <a
          href="https://grochurch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-200"
        >
          <ExternalLink className="w-[18px] h-[18px]" />
          grochurch.com
        </a>
      </div>
    </aside>
  );
}
