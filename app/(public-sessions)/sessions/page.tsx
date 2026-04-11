import { createClient } from "@/lib/supabase/server";
import { SessionsPageClient } from "@/components/session/sessions-page-client";

export const metadata = { title: "Sessions finden" };

const DEFAULT_LAT = 52.52;
const DEFAULT_LNG = 13.405;
const DEFAULT_CITY = "Berlin";

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

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

  const { data: sessions } = await supabase.rpc("nearby_sessions", {
    p_lat: lat,
    p_lng: lng,
    radius_km: 25,
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
    <SessionsPageClient
      initialSessions={mappedSessions}
      serverLat={lat}
      serverLng={lng}
      serverCity={cityLabel}
    />
  );
}
