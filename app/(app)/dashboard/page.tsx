import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeroActions } from "@/components/home/hero-actions";
import { NearbySessions } from "@/components/home/nearby-sessions";
import { UpcomingSessions } from "@/components/home/upcoming-sessions";
import { TcgShortcuts } from "@/components/home/tcg-shortcuts";

export const metadata = { title: "Home — CardMeet" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, city, lat, lng")
    .eq("id", user.id)
    .single();

  const userLat = (profile as any)?.lat ?? 52.52;
  const userLng = (profile as any)?.lng ?? 13.405;

  const [
    { data: nearbySessions },
    { data: participations },
    { data: hostedUpcoming },
    { count: openCount },
  ] = await Promise.all([
    // Nearby sessions via RPC
    supabase.rpc("nearby_sessions", {
      p_lat: userLat,
      p_lng: userLng,
      radius_km: 25,
    }).limit(5),

    // Sessions the user has joined
    supabase
      .from("session_participants")
      .select("sessions(id, title, tcg, format, max_players, current_players, city, location_name, scheduled_at)")
      .eq("user_id", user.id)
      .eq("status", "joined"),

    // Sessions the user hosts (upcoming)
    supabase
      .from("sessions")
      .select("id, title, tcg, format, max_players, current_players, city, location_name, scheduled_at")
      .eq("host_id", user.id)
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),

    // Total open session count for HeroActions
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gt("scheduled_at", new Date().toISOString()),
  ]);

  // Merge joined + hosted upcoming sessions, sorted by date
  const joinedUpcoming = (participations ?? [])
    .map((p) => (p as any).sessions)
    .filter((s: any) => s && new Date(s.scheduled_at) > new Date());

  const allUpcoming = [
    ...(hostedUpcoming ?? []),
    ...joinedUpcoming,
  ]
    .filter((s, i, arr) => arr.findIndex((x: any) => x.id === (s as any).id) === i)
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 6);

  const joinedSessionIds = new Set(
    (participations ?? []).map((p: any) => p.sessions?.id).filter(Boolean)
  );

  const nearbyMapped = (nearbySessions ?? []).map((s: any) => ({
    id: s.id,
    title: s.title,
    tcg: s.tcg,
    format: s.format,
    power_level: s.power_level ?? null,
    max_players: s.max_players,
    current_players: s.current_players,
    status: s.status,
    city: s.city ?? null,
    location_name: s.location_name ?? null,
    scheduled_at: s.scheduled_at,
    host_id: s.host_id,
    profiles: s.profiles ?? null,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-[-0.02em]">
          {greeting}, {profile?.username ?? "Spieler"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Was steht heute an?
        </p>
      </div>

      {/* Quick actions */}
      <HeroActions openSessionCount={openCount ?? 0} />

      {/* Upcoming sessions */}
      {allUpcoming.length > 0 && (
        <UpcomingSessions sessions={allUpcoming as any} />
      )}

      {/* TCG shortcuts */}
      <TcgShortcuts />

      {/* Nearby sessions */}
      <NearbySessions
        sessions={nearbyMapped}
        currentUserId={user.id}
        joinedSessionIds={joinedSessionIds}
      />
    </div>
  );
}
