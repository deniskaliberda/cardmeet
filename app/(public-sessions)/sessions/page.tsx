import { createClient } from "@/lib/supabase/server";
import { LandingExplorer } from "@/components/landing/landing-explorer";

export const metadata = { title: "Sessions finden" };
export const revalidate = 60;

// Fallback: Berlin
const DEFAULT_LAT = 52.52;
const DEFAULT_LNG = 13.405;
const DEFAULT_CITY = "Berlin";

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Use the user's saved city if available
  let lat = DEFAULT_LAT;
  let lng = DEFAULT_LNG;
  let cityLabel = DEFAULT_CITY;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("city, city_lat, city_lng")
      .eq("id", user.id)
      .single();

    if (profile?.city_lat && profile?.city_lng) {
      lat = profile.city_lat;
      lng = profile.city_lng;
      cityLabel = profile.city ?? DEFAULT_CITY;
    }
  }

  const { data: sessions, error: rpcError } = await supabase.rpc("nearby_sessions", {
    lat,
    lng,
    radius_km: 50,
  });
  if (rpcError) console.error("[sessions page] RPC error:", rpcError);

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
        <p className="text-sm text-muted-foreground">
          {cityLabel} & Umland · 50 km Radius
        </p>
      </div>
      {rpcError && (
        <pre className="rounded bg-red-100 p-3 text-xs text-red-800 overflow-auto">
          {JSON.stringify(rpcError, null, 2)}
        </pre>
      )}
      <LandingExplorer sessions={mappedSessions} />
    </div>
  );
}
