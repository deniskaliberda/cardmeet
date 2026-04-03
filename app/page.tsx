import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import { LandingFeatures } from "@/components/landing/landing-features";

export const revalidate = 60;

export default async function LandingPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("nearby_sessions", {
    lat: 51.16,
    lng: 10.45,
    radius_km: 1000,
  });

  const mappedSessions = (sessions ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    title: s.title as string,
    tcg: s.tcg as string,
    format: s.format as string,
    max_players: s.max_players as number,
    current_players: s.current_players as number,
    status: s.status as string,
    city: (s.city as string) ?? null,
    location_name: (s.location_name as string) ?? null,
    lat: s.lat as number,
    lng: s.lng as number,
    scheduled_at: s.scheduled_at as string,
    host_username: (s.host_username as string) ?? null,
    host_avatar: (s.host_avatar as string) ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />

      <main className="flex flex-1 flex-col">
        <LandingExplorer sessions={mappedSessions} />
        <LandingFeatures />
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} CardMeet</span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
