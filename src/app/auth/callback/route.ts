import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get the user to check if we need to create a profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Use admin client to upsert profile (bypasses RLS)
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if profile exists
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          // Create profile for Google OAuth user
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
          
          await adminClient.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl,
            role: "member",
            is_active: true,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`);
}
