import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddFriendSearch } from "@/components/friends/add-friend-search";
import { FriendList } from "@/components/friends/friend-list";

export const metadata = { title: "Freunde" };

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

  const friends: any[] = [];
  const pendingRequests: any[] = [];

  for (const f of friendships ?? []) {
    const isRequester = f.requester_id === user.id;
    const otherProfile = isRequester
      ? (f as any)["profiles!friendships_addressee_id_fkey"]
      : (f as any)["profiles!friendships_requester_id_fkey"];

    const entry = {
      friendship_id: f.id,
      user_id: otherProfile?.id ?? "",
      username: otherProfile?.username ?? "Unbekannt",
      avatar_url: otherProfile?.avatar_url ?? null,
      avg_rating: null,
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
