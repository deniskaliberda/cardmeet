"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Compass, Store, Bookmark, User, Plus, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DmPanel } from "@/components/chat/dm-panel";
import { cn } from "@/lib/utils";

type AppUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
};

const DESKTOP_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/sessions", label: "Sessions", icon: Compass },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/sessions/create", label: "Erstellen", icon: Plus },
  { href: "/profile", label: "Profil", icon: User },
] as const;

const MOBILE_NAV = [
  { href: "/dashboard", icon: Home },
  { href: "/sessions", icon: Compass },
  { href: "/shops", icon: Store },
  { href: "/profile", icon: User },
] as const;

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Floating navbar */}
      <header className="sticky top-2.5 z-50 px-4 sm:px-6">
        <nav
          className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between rounded-2xl border border-border bg-card/90 px-6 backdrop-blur-xl"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)" }}
        >
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-primary"
            style={{
              fontFamily: "var(--font-mono), 'Fira Code', monospace",
              fontSize: "1.25em",
              fontWeight: 300,
              letterSpacing: "-1.5px",
            }}
          >
            CARDMEET
          </Link>

          {/* Center tabs — desktop only */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-0.5 md:flex">
            {DESKTOP_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-white shadow-[0_2px_8px_oklch(0.5_0.2_264/25%)]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right: chat + bell + avatar */}
          <div className="flex items-center gap-2">
            <DmPanel userId={user.id} />
            <NotificationBell userId={user.id} />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white transition-all hover:shadow-[0_0_12px_oklch(0.5_0.2_264/30%)] focus:outline-none">
                {user.username.slice(0, 2).toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>

      {/* Main Content — extra bottom padding on mobile for nav + FAB */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      <SiteFooter />

      {/* Floating Action Button — mobile only */}
      <Link
        href="/sessions/create"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_20px_oklch(0.5_0.2_264/40%)] transition-all active:scale-95 md:hidden"
        style={{ background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.20 285))" }}
      >
        <Plus className="h-6 w-6" />
      </Link>

      {/* Mobile Bottom Nav — icon only, 4 items */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around py-2.5">
          {MOBILE_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 p-2.5 transition-colors active:scale-95"
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {isActive && (
                  <span className="h-1 w-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
