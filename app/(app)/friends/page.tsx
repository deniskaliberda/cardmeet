import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddFriendSearch } from "@/components/friends/add-friend-search";
import { FriendList } from "@/components/friends/friend-list";
import { getProfileRatings } from "@/lib/queries/ratings";

export const metadata = { title: "Freunde" };

type ProfileMini = { id: string; username: string; avatar_url: string | null };
type FriendshipRow = {
  id: string;
  status: "accepted" | "pending" | "blocked";
  requester_id: string;
  addressee_id: string;
  ["profiles!friendships_addressee_id_fkey"]: ProfileMini | null;
  ["profiles!friendships_requester_id_fkey"]: ProfileMini | null;
};

type FriendEntry = {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  avg_rating: number | null;
  status: "accepted" | "pending";
  is_incoming: boolean;
};

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, status, requester_id, addressee_id, profiles!friendships_addressee_id_fkey(id, username, avatar_url), profiles!friendships_requester_id_fkey(id, username, avatar_url)"
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .in("status", ["accepted", "pending"]);

  const rows = (friendships ?? []) as unknown as FriendshipRow[];
  const otherIds = rows
    .map((f) =>
      f.requester_id === user.id
        ? f["profiles!friendships_addressee_id_fkey"]?.id
        : f["profiles!friendships_requester_id_fkey"]?.id
    )
    .filter((id): id is string => Boolean(id));

  const ratingMap = await getProfileRatings(supabase, otherIds);

  const friends: FriendEntry[] = [];
  const pendingRequests: FriendEntry[] = [];

  for (const f of rows) {
    const isRequester = f.requester_id === user.id;
    const otherProfile = isRequester
      ? f["profiles!friendships_addressee_id_fkey"]
      : f["profiles!friendships_requester_id_fkey"];

    if (!otherProfile?.id) continue;
    if (f.status === "blocked") continue;

    const entry: FriendEntry = {
      friendship_id: f.id,
      user_id: otherProfile.id,
      username: otherProfile.username ?? "Unbekannt",
      avatar_url: otherProfile.avatar_url ?? null,
      avg_rating: ratingMap.get(otherProfile.id) ?? null,
      status: f.status as "accepted" | "pending",
      is_incoming: !isRequester,
    };

    if (f.status === "accepted") {
      friends.push(entry);
    } else if (f.status === "pending") {
      pendingRequests.push(entry);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Freunde</h1>
        <p className="text-muted-foreground">
          Finde Mitspieler und verwalte deine Freundesliste
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Freund hinzufügen
        </h2>
        <AddFriendSearch />
      </div>

      <FriendList friends={friends} pendingRequests={pendingRequests} />
    </div>
  );
}
