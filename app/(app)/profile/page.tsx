import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Run all queries in parallel
  const [
    profileResult,
    avgRatingResult,
    hostedCountResult,
    participantCountResult,
    friendCountResult,
    reviewsResult,
    acceptedFriendshipsResult,
    pendingFriendshipsResult,
    alertsResult,
    hostedSessionsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.rpc("get_profile_rating", { profile_id: user.id }),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("host_id", user.id),
    supabase
      .from("session_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "joined"),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("reviews")
      .select(
        "id, rating, comment, created_at, profiles!reviews_reviewer_id_fkey(username, avatar_url)"
      )
      .eq("reviewed_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("friendships")
      .select(
        `id, status, requester_id, addressee_id,
         requester:profiles!friendships_requester_id_fkey(id, username, avatar_url),
         addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)`
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("friendships")
      .select(
        `id, status, requester_id, addressee_id,
         requester:profiles!friendships_requester_id_fkey(id, username, avatar_url),
         addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)`
      )
      .eq("status", "pending")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("session_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, title, tcg, status, scheduled_at, max_players, current_players")
      .eq("host_id", user.id)
      .order("scheduled_at", { ascending: false }),
  ]);

  const profile = profileResult.data;
  if (!profile) redirect("/register");

  const sessionCount =
    (hostedCountResult.count ?? 0) + (participantCountResult.count ?? 0);

  // Map friendships to FriendList format
  const friends = (acceptedFriendshipsResult.data ?? []).map((f: any) => {
    const isRequester = f.requester_id === user.id;
    const friendProfile = isRequester ? f.addressee : f.requester;
    return {
      friendship_id: f.id,
      user_id: friendProfile.id,
      username: friendProfile.username,
      avatar_url: friendProfile.avatar_url,
      avg_rating: null,
      status: "accepted" as const,
      is_incoming: false,
    };
  });

  const pendingRequests = (pendingFriendshipsResult.data ?? []).map(
    (f: any) => {
      const isIncoming = f.addressee_id === user.id;
      const friendProfile = isIncoming ? f.requester : f.addressee;
      return {
        friendship_id: f.id,
        user_id: f.requester_id,
        username: friendProfile.username,
        avatar_url: friendProfile.avatar_url,
        avg_rating: null,
        status: "pending" as const,
        is_incoming: isIncoming,
      };
    }
  );

  const enrichedProfile = {
    ...profile,
    avg_rating: (avgRatingResult.data as number | null) ?? null,
    review_count: reviewsResult.data?.length ?? 0,
    session_count: sessionCount,
    friend_count: friendCountResult.count ?? 0,
  };

  return (
    <ProfileView
      profile={enrichedProfile}
      hostedSessions={hostedSessionsResult.data ?? []}
      reviews={(reviewsResult.data ?? []) as any[]}
      friends={friends}
      pendingRequests={pendingRequests}
      alerts={(alertsResult.data ?? []) as any[]}
    />
  );
}
