import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MySessionsView } from "@/components/session/my-sessions-view";

export const metadata = { title: "Meine Sessions" };

export default async function MySessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();

  // Sessions als Host
  const { data: hostedSessions } = await supabase
    .from("sessions")
    .select(`*, profiles!sessions_host_id_fkey(id, username, avatar_url)`)
    .eq("host_id", user.id)
    .order("scheduled_at", { ascending: true });

  // Sessions als Teilnehmer
  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("user_id", user.id)
    .eq("status", "joined");

  const participantIds = (participations ?? []).map((p) => p.session_id);

  const { data: joinedSessions } =
    participantIds.length > 0
      ? await supabase
          .from("sessions")
          .select(`*, profiles!sessions_host_id_fkey(id, username, avatar_url)`)
          .in("id", participantIds)
          .neq("host_id", user.id)
          .order("scheduled_at", { ascending: true })
      : { data: [] };

  const allSessions = [
    ...(hostedSessions ?? []).map((s) => ({ ...s, role: "host" as const })),
    ...(joinedSessions ?? []).map((s) => ({ ...s, role: "participant" as const })),
  ].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const upcoming = allSessions.filter((s) => new Date(s.scheduled_at) > new Date());
  const past = allSessions.filter((s) => new Date(s.scheduled_at) <= new Date());

  // Pre-load data for first upcoming session (or first past if no upcoming)
  const firstSession = upcoming[0] ?? past[0] ?? null;

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

  return (
    <MySessionsView
      upcoming={upcoming}
      past={past}
      initialSessionId={firstSession?.id ?? null}
      initialParticipants={initialParticipants as any}
      initialMessages={initialMessages as any}
      currentUserId={user.id}
    />
  );
}
