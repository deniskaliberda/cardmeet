import { createClient } from "@/lib/supabase/server";
import { SessionsBrowser } from "@/components/session/sessions-browser";

export const metadata = { title: "Sessions — CardMeet" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tcg = typeof params.tcg === "string" ? params.tcg : undefined;
  const format = typeof params.format === "string" ? params.format : undefined;
  const date = typeof params.date === "string" ? params.date : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Build date filter
  let dateFrom = new Date().toISOString();
  let dateTo: string | undefined;

  if (date === "today") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    dateTo = end.toISOString();
  } else if (date === "tomorrow") {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    dateFrom = start.toISOString();
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    dateTo = end.toISOString();
  } else if (date === "week") {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    dateTo = end.toISOString();
  }

  // Fetch sessions with geolocation data
  let query = supabase
    .from("sessions")
    .select("*, profiles!sessions_host_id_fkey(username, avatar_url)")
    .in("status", ["open", "full"])
    .gt("scheduled_at", dateFrom)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (dateTo) {
    query = query.lt("scheduled_at", dateTo);
  }

  const { data: sessions } = await query;

  const filteredSessions = (sessions ?? []).filter((s) => {
    if (tcg && s.tcg !== tcg) return false;
    if (format && s.format !== format) return false;
    return true;
  });

  // Get user's joined session IDs + alerts in parallel
  const [{ data: participations }, { data: alerts }, { data: upcomingJoined }] =
    await Promise.all([
      supabase
        .from("session_participants")
        .select("session_id")
        .eq("user_id", user.id)
        .eq("status", "joined"),
      supabase
        .from("session_alerts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active"),
      // User's next upcoming sessions (for the quick-info bar)
      supabase
        .from("session_participants")
        .select("sessions(id, title, tcg, scheduled_at)")
        .eq("user_id", user.id)
        .eq("status", "joined")
        .limit(3),
    ]);
  const joinedSessionIds = (participations ?? []).map((p) => p.session_id);
  const nextSessions = (upcomingJoined ?? [])
    .map((p) => p.sessions)
    .filter((s): s is NonNullable<typeof s> => s != null)
    .filter((s: any) => new Date(s.scheduled_at) > new Date())
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 2);

  // Map to MapSession format for the map
  const mapSessions = filteredSessions.map((s) => ({
    id: s.id,
    title: s.title,
    tcg: s.tcg,
    format: s.format,
    max_players: s.max_players,
    current_players: s.current_players,
    status: s.status,
    city: s.city ?? null,
    location_name: s.location_name ?? null,
    lat: s.lat ?? 52.52,
    lng: s.lng ?? 13.405,
    scheduled_at: s.scheduled_at,
    host_username: s.profiles?.username ?? null,
    host_avatar: s.profiles?.avatar_url ?? null,
  }));

  return (
    <SessionsBrowser
      sessions={filteredSessions}
      mapSessions={mapSessions}
      currentUserId={user.id}
      joinedSessionIds={joinedSessionIds}
      activeTcg={tcg}
      activeFormat={format}
      activeDate={date}
      alerts={(alerts ?? []) as any}
      nextSessions={(nextSessions ?? []) as any}
    />
  );
}
