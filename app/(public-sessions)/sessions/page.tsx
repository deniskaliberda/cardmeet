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

  // Fetch user's own sessions (upcoming) if logged in
  let mySessions: typeof mappedSessions = [];
  if (user) {
    // Sessions user is hosting
    const { data: hosted } = await supabase
      .from("sessions")
      .select("id, title, tcg, format, max_players, current_players, status, city, location_name, postal_code, lat, lng, scheduled_at, host_id, profiles!sessions_host_id_fkey(username, avatar_url)")
      .eq("host_id", user.id)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20);

    // Sessions user has joined
    const { data: joined } = await supabase
      .from("session_participants")
      .select("session_id, sessions(id, title, tcg, format, max_players, current_players, status, city, location_name, postal_code, lat, lng, scheduled_at, host_id, profiles!sessions_host_id_fkey(username, avatar_url))")
      .eq("user_id", user.id)
      .eq("status", "joined");

    const hostedMapped = (hosted ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      tcg: s.tcg,
      format: s.format,
      max_players: s.max_players,
      current_players: s.current_players,
      status: s.status,
      city: s.city,
      location_name: s.location_name,
      postal_code: s.postal_code ?? null,
      lat: s.lat,
      lng: s.lng,
      scheduled_at: s.scheduled_at,
      host_username: (s.profiles as any)?.username ?? null,
      host_avatar: (s.profiles as any)?.avatar_url ?? null,
      isHost: true,
    }));

    const joinedMapped = (joined ?? [])
      .filter((p) => p.sessions)
      .map((p) => {
        const s = p.sessions as any;
        return {
          id: s.id,
          title: s.title,
          tcg: s.tcg,
          format: s.format,
          max_players: s.max_players,
          current_players: s.current_players,
          status: s.status,
          city: s.city,
          location_name: s.location_name,
          postal_code: s.postal_code ?? null,
          lat: s.lat,
          lng: s.lng,
          scheduled_at: s.scheduled_at,
          host_username: s.profiles?.username ?? null,
          host_avatar: s.profiles?.avatar_url ?? null,
          isHost: false,
        };
      });

    // Deduplicate and sort
    const seen = new Set<string>();
    mySessions = [...hostedMapped, ...joinedMapped]
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return new Date(s.scheduled_at) >= new Date();
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  return (
    <SessionsPageClient
      initialSessions={mappedSessions}
      mySessions={mySessions}
      isLoggedIn={!!user}
      serverLat={lat}
      serverLng={lng}
      serverCity={cityLabel}
    />
  );
}
