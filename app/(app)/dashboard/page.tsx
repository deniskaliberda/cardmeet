import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeView } from "@/components/home/home-view";

export const metadata = { title: "Home — CardMeet" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, city, city_lat, city_lng, preferred_tcgs")
    .eq("id", user.id)
    .single();

  const userLat = (profile as any)?.city_lat ?? 52.52;
  const userLng = (profile as any)?.city_lng ?? 13.405;
  const now = new Date().toISOString();

  const [
    { data: nearbySessions },
    { data: participations },
    { data: hostedUpcoming },
    { count: openCount },
    { data: hostedAll },
    { data: joinedAll },
    { data: activeLfgPosts },
    { data: friendships },
  ] = await Promise.all([
    supabase.rpc("nearby_sessions", { p_lat: userLat, p_lng: userLng, radius_km: 25 }).limit(5),

    supabase
      .from("session_participants")
      .select("sessions(id, title, tcg, format, max_players, current_players, city, location_name, scheduled_at)")
      .eq("user_id", user.id)
      .eq("status", "joined"),

    supabase
      .from("sessions")
      .select("id, title, tcg, format, max_players, current_players, city, location_name, scheduled_at")
      .eq("host_id", user.id)
      .gt("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(5),

    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gt("scheduled_at", now),

    // All hosted sessions (for Meine Sessions tab)
    supabase
      .from("sessions")
      .select("*, profiles!sessions_host_id_fkey(id, username, avatar_url)")
      .eq("host_id", user.id)
      .order("scheduled_at", { ascending: true }),

    // All joined sessions (for Meine Sessions tab)
    supabase
      .from("session_participants")
      .select("session_id")
      .eq("user_id", user.id)
      .eq("status", "joined"),

    // Active LFG posts for current user
    supabase
      .from("lfg_posts")
      .select("id, tcg, format, available_from, available_to, location_label, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    // Friends for invite
    supabase
      .from("friendships")
      .select("requester_id, addressee_id, profiles!friendships_addressee_id_fkey(id, username, avatar_url), profiles!friendships_requester_id_fkey(id, username, avatar_url)")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted"),
  ]);

  // ── Overview tab data ─────────────────────────────────────────────────────
  const joinedUpcomingCompact = (participations ?? [])
    .map((p) => (p as any).sessions)
    .filter((s: any) => s && new Date(s.scheduled_at) > new Date());

  const allUpcoming = [
    ...(hostedUpcoming ?? []),
    ...joinedUpcomingCompact,
  ]
    .filter((s, i, arr) => arr.findIndex((x: any) => x.id === (s as any).id) === i)
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 6);

  const joinedSessionIds = new Set(
    (participations ?? []).map((p: any) => p.sessions?.id).filter(Boolean)
  );

  const nearbyMapped = (nearbySessions ?? []).map((s: any) => ({
    id: s.id, title: s.title, tcg: s.tcg, format: s.format,
    power_level: s.power_level ?? null, max_players: s.max_players,
    current_players: s.current_players, status: s.status,
    city: s.city ?? null, location_name: s.location_name ?? null,
    scheduled_at: s.scheduled_at, host_id: s.host_id, profiles: s.profiles ?? null,
  }));

  // ── Meine Sessions tab data ───────────────────────────────────────────────
  const participantIds = (joinedAll ?? []).map((p) => p.session_id);

  const { data: joinedSessionsFull } = participantIds.length > 0
    ? await supabase
        .from("sessions")
        .select("*, profiles!sessions_host_id_fkey(id, username, avatar_url)")
        .in("id", participantIds)
        .neq("host_id", user.id)
        .order("scheduled_at", { ascending: true })
    : { data: [] };

  const allSessions = [
    ...(hostedAll ?? []).map((s) => ({ ...s, role: "host" as const })),
    ...(joinedSessionsFull ?? []).map((s) => ({ ...s, role: "participant" as const })),
  ].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const myUpcoming = allSessions.filter((s) => new Date(s.scheduled_at) > new Date());
  const myPast = allSessions.filter((s) => new Date(s.scheduled_at) <= new Date());
  const firstSession = myUpcoming[0] ?? myPast[0] ?? null;

  const [initialParticipants, initialMessages] = firstSession
    ? await Promise.all([
        supabase
          .from("session_participants")
          .select("user_id, status, profiles(id, username, avatar_url)")
          .eq("session_id", firstSession.id)
          .eq("status", "joined")
          .then((r) => r.data ?? []),
        supabase
          .from("messages")
          .select("*, profiles(username, avatar_url)")
          .eq("session_id", firstSession.id)
          .order("created_at", { ascending: true })
          .limit(100)
          .then((r) => r.data ?? []),
      ])
    : [[], []];

  const friends = (friendships ?? []).map((f) => {
    const isRequester = f.requester_id === user.id;
    const p = isRequester
      ? (f as any)["profiles!friendships_addressee_id_fkey"]
      : (f as any)["profiles!friendships_requester_id_fkey"];
    return { user_id: p?.id ?? "", username: p?.username ?? "Unbekannt", avatar_url: p?.avatar_url ?? null, avg_rating: null };
  }).filter((f) => f.user_id);

  // Fetch friends' upcoming sessions
  const friendIds = friends.map((f) => f.user_id).filter(Boolean);
  let friendsSessions: any[] = [];
  if (friendIds.length > 0) {
    const { data: friendParticipations } = await supabase
      .from("session_participants")
      .select("user_id, sessions(id, title, tcg, format, scheduled_at, city, location_name, current_players, max_players, status, shop_id, shops(name)), profiles(username, avatar_url)")
      .in("user_id", friendIds)
      .eq("status", "joined")
      .gt("sessions.scheduled_at", now)
      .limit(10);

    friendsSessions = (friendParticipations ?? [])
      .filter((fp: any) => fp.sessions && new Date(fp.sessions.scheduled_at) > new Date())
      .map((fp: any) => ({
        friend_username: (fp.profiles as any)?.username ?? "Unbekannt",
        friend_avatar_url: (fp.profiles as any)?.avatar_url ?? null,
        session_id: fp.sessions.id,
        session_title: fp.sessions.title,
        session_tcg: fp.sessions.tcg,
        session_format: fp.sessions.format,
        session_scheduled_at: fp.sessions.scheduled_at,
        session_city: fp.sessions.city,
        session_location_name: fp.sessions.location_name,
        session_current_players: fp.sessions.current_players,
        session_max_players: fp.sessions.max_players,
        shop_name: fp.sessions.shops?.name ?? null,
      }))
      // Deduplicate by session_id (multiple friends might be in same session)
      .filter((fs: any, i: number, arr: any[]) =>
        arr.findIndex((x) => x.session_id === fs.session_id && x.friend_username === fs.friend_username) === i
      )
      .sort((a: any, b: any) => new Date(a.session_scheduled_at).getTime() - new Date(b.session_scheduled_at).getTime())
      .slice(0, 5);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <HomeView
      username={profile?.username ?? "Spieler"}
      greeting={greeting}
      openCount={openCount ?? 0}
      allUpcoming={allUpcoming}
      nearbyMapped={nearbyMapped}
      joinedSessionIds={joinedSessionIds}
      activeLfgPosts={activeLfgPosts ?? []}
      preferredTcgs={(profile as any)?.preferred_tcgs ?? []}
      userLat={userLat}
      userLng={userLng}
      userCity={profile?.city ?? "Berlin"}
      friendsSessions={friendsSessions}
      mySessionsUpcoming={myUpcoming}
      mySessionsPast={myPast}
      initialSessionId={firstSession?.id ?? null}
      initialParticipants={initialParticipants as any}
      initialMessages={initialMessages as any}
      currentUserId={user.id}
      friends={friends}
    />
  );
}
