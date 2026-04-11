import { createClient } from "@/lib/supabase/server";
import { LandingExplorer } from "@/components/landing/landing-explorer";

export const metadata = { title: "Sessions finden" };
export const revalidate = 60;

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("nearby_sessions", {
    lat: 52.52,
    lng: 13.405,
    radius_km: 50,
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
    postal_code: (s.postal_code as string) ?? null,
    lat: s.lat as number,
    lng: s.lng as number,
    scheduled_at: s.scheduled_at as string,
    host_username: (s.host_username as string) ?? null,
    host_avatar: (s.host_avatar as string) ?? null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Sessions in deiner Nähe</h1>
        <p className="text-sm text-muted-foreground">Berlin & Umland · 50 km Radius</p>
      </div>
      <LandingExplorer sessions={mappedSessions} />
    </div>
  );
}
