import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter } from "@/components/layout/site-footer";

export default async function PublicSessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <LandingHeader />
        <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pb-16 pt-8 sm:px-6">
          {children}
        </div>
        <SiteFooter />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        username: profile?.username ?? "",
        avatarUrl: profile?.avatar_url,
      }}
    >
      {children}
    </AppShell>
  );
}
