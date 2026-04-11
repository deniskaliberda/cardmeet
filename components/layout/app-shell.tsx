"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

type AppUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
};

const NAV_ITEMS = [
  { href: "/sessions", label: "🎴 Sessions" },
  { href: "/sessions/create", label: "➕ Erstellen" },
  { href: "/profile", label: "👤 Profil" },
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
          className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between rounded-[14px] border border-border bg-card/92 px-8 backdrop-blur-md"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}
        >
          {/* Logo */}
          <Link
            href="/sessions"
            className="text-primary"
            style={{
              fontFamily: "var(--font-mono), 'Fira Code', monospace",
              fontSize: "1.35em",
              fontWeight: 300,
              letterSpacing: "-1.5px",
            }}
          >
            CARDMEET
          </Link>

          {/* Center tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
                  style={{
                    background: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "#fff" : "var(--muted-foreground)",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--background)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right: avatar + logout */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-primary text-xs font-semibold text-white transition-colors hover:border-primary focus:outline-none">
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

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1 text-xs"
                style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
