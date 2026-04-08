import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { UserProvider } from "@/context/UserContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { CrmAssistantProvider } from "@/context/CrmAssistantContext";
import CrmAssistant from "@/components/crm-assistant/CrmAssistant";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserProvider>
        <CrmAssistantProvider>
          <SidebarProvider>
            <NotificationProvider>
              <div className="flex h-screen bg-transparent overflow-hidden">
                <Sidebar profile={profile} />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <TopBar profile={profile} />
                  <main className="flex-1 overflow-y-auto p-6">
                    {children}
                  </main>
                </div>
              </div>
              <CrmAssistant />
            </NotificationProvider>
          </SidebarProvider>
        </CrmAssistantProvider>
      </UserProvider>
      <Toaster position="bottom-right" richColors />
    </ThemeProvider>
  );
}
