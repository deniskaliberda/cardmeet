import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicProfile } from "@/components/profile/public-profile";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: sessions }, { data: reviews }, { data: friendshipRow }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, bio, city, avatar_url, preferred_tcgs, avg_rating, review_count, session_count"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("sessions")
        .select("id, title, tcg, format, scheduled_at, max_players, current_players, status")
        .eq("host_id", id)
        .eq("status", "open")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("reviews")
        .select(
          "id, rating, comment, created_at, profiles!reviews_reviewer_id_fkey(username, avatar_url)"
        )
        .eq("reviewee_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      user
        ? supabase
            .from("friendships")
            .select("id, status, requester_id")
            .or(
              `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
            )
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (!profile) notFound();

  const friendship = friendshipRow
    ? {
        id: friendshipRow.id as string,
        status: friendshipRow.status as "pending" | "accepted" | "blocked",
        isRequester: (friendshipRow.requester_id as string) === user?.id,
      }
    : null;

  return (
    <PublicProfile
      profile={profile as any}
      hostedSessions={(sessions ?? []) as any[]}
      reviews={(reviews ?? []) as any[]}
      currentUserId={user?.id ?? null}
      friendship={friendship}
    />
  );
}
