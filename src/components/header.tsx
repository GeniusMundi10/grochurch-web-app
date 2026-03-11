"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, User, LogOut, Bell, Menu, Settings } from "lucide-react"
import { signOut } from "@/lib/auth"
import { useUser } from "@/context/UserContext"
import { useNotifications } from "@/context/NotificationContext"
import { useSidebar } from "@/context/SidebarContext"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"

interface HeaderProps {
  title: string
  description?: string
  showTitleInHeader?: boolean
}

export default function Header({ title, description, showTitleInHeader = true }: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false)
  const { notifications, markAllRead, markAsRead } = useNotifications();
  const { toggleSidebar, isMobile } = useSidebar();
  const { user } = useUser();

  const unreadCount = notifications.filter(n => n.unread).length
  const userFullName = user?.full_name || "Pastor"
  const userInitials = userFullName.split(" ").map((n) => n[0]).join("").toUpperCase()

  return (
    <>
      <motion.header
        className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm shadow-sm"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {showTitleInHeader && (
              <h1 className="text-xl font-bold flex items-center">
                {title}
                {user?.service_plan && (
                  <Badge variant="outline" className="ml-3 bg-orange-50 text-orange-700 border-orange-200">
                    {user.service_plan.toUpperCase()}
                  </Badge>
                )}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative rounded-full p-2 h-10 w-10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[380px] p-4 text-center">
                 <p className="text-sm text-gray-500">No new notifications</p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200">
                  <Avatar className="h-8 w-8">
                    {user?.avatar_url ? (
                      <AvatarImage src={user.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-orange-50 text-orange-700">{userInitials}</AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="mr-2 h-4 w-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); router.push("/auth/signin"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {!showTitleInHeader && (
        <motion.div className="bg-white border-b relative" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{title}</h1>
            {description && <p className="text-slate-600 text-lg">{description}</p>}
          </div>
        </motion.div>
      )}
    </>
  )
}
