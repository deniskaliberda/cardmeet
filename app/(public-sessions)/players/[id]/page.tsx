import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PublicProfile } from "@/components/profile/public-profile";
import { getProfileRatings } from "@/lib/queries/ratings";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/players/${id}`);

  const renderedAtIso = new Date().toISOString();

  const [
    { data: profile },
    { data: sessions },
    { data: reviews },
    { count: hostedCount },
    { count: joinedCount },
    { data: friendshipRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, bio, city, avatar_url, preferred_tcgs")
      .eq("id", id)
      .single(),
    supabase
      .from("sessions")
      .select("id, title, tcg, format, scheduled_at, max_players, current_players, status")
      .eq("host_id", id)
      .eq("status", "open")
      .gt("scheduled_at", renderedAtIso)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("reviews")
      .select(
        "id, recommended, tags, comment, created_at, profiles!reviews_reviewer_id_fkey(username, avatar_url)"
      )
      .eq("reviewed_id", id)
      .eq("recommended", true)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("host_id", id),
    supabase
      .from("session_participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("status", "joined"),
    supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
      )
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const ratingMap = await getProfileRatings(supabase, [id]);
  const recommendCount = ratingMap.get(id) ?? 0;

  const profileEnriched = {
    ...profile,
    avg_rating: recommendCount,
    review_count: recommendCount,
    session_count: (hostedCount ?? 0) + (joinedCount ?? 0),
  };

  const friendship = friendshipRow
    ? {
        id: friendshipRow.id as string,
        status: friendshipRow.status as "pending" | "accepted" | "blocked",
        isRequester: (friendshipRow.requester_id as string) === user.id,
      }
    : null;

  return (
    <PublicProfile
      profile={profileEnriched}
      hostedSessions={sessions ?? []}
      reviews={(reviews ?? []) as unknown as Parameters<typeof PublicProfile>[0]["reviews"]}
      currentUserId={user.id}
      friendship={friendship}
    />
  );
}
