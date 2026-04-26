import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MySessionsView } from "@/components/session/my-sessions-view";
import { getProfileRatings } from "@/lib/queries/ratings";

export const metadata = { title: "Meine Sessions" };

type ProfileMini = { id: string; username: string; avatar_url: string | null };

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  ["profiles!friendships_addressee_id_fkey"]: ProfileMini | null;
  ["profiles!friendships_requester_id_fkey"]: ProfileMini | null;
};

type ParticipantRow = {
  user_id: string;
  status: string;
  profiles: { id?: string; username: string; avatar_url: string | null } | null;
};

type MessageRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export default async function MySessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single render-time anchor — keeps cutoff stable across the request and
  // satisfies React's purity rule (no Date.now() during render).
  const renderedAt = new Date();

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

  // Sessions gelten 3h nach Startzeit als vergangen (typische TCG-Rundendauer)
  const cutoff = new Date(renderedAt.getTime() - 3 * 60 * 60 * 1000);
  const upcoming = allSessions.filter((s) => new Date(s.scheduled_at) > cutoff);
  const past = allSessions.filter((s) => new Date(s.scheduled_at) <= cutoff);

  // Friends for invite feature
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, profiles!friendships_addressee_id_fkey(id, username, avatar_url), profiles!friendships_requester_id_fkey(id, username, avatar_url)")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  const friendsRaw = ((friendships ?? []) as unknown as FriendshipRow[]).map((f) => {
    const isRequester = f.requester_id === user.id;
    const profile = isRequester
      ? f["profiles!friendships_addressee_id_fkey"]
      : f["profiles!friendships_requester_id_fkey"];
    return {
      user_id: profile?.id ?? "",
      username: profile?.username ?? "Unbekannt",
      avatar_url: profile?.avatar_url ?? null,
    };
  }).filter((f) => f.user_id);

  const ratingMap = await getProfileRatings(supabase, friendsRaw.map((f) => f.user_id));
  const friends = friendsRaw.map((f) => ({
    ...f,
    avg_rating: ratingMap.get(f.user_id) ?? null,
  }));

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
      initialParticipants={initialParticipants as unknown as ParticipantRow[]}
      initialMessages={initialMessages as unknown as MessageRow[]}
      currentUserId={user.id}
      friends={friends}
    />
  );
}
