"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();

export async function searchUsers(query: string) {
  if (!query || query.trim().length < 2) return { users: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${query.trim()}%`)
    .neq("id", user.id)
    .limit(8);

  if (error) return { error: error.message };

  // Also fetch existing friendships to show correct button state
  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, addressee_id, requester_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const users = (data ?? []).map((profile) => {
    const friendship = friendships?.find(
      (f) =>
        f.requester_id === profile.id || f.addressee_id === profile.id
    );
    return {
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      friendship_id: friendship?.id ?? null,
      friendship_status: friendship?.status ?? null,
    };
  });

  return { users };
}

export async function sendFriendRequest(addresseeId: string) {
  const parsed = uuidSchema.safeParse(addresseeId);
  if (!parsed.success) return { error: "Ungueltige Nutzer-ID" };
  const safeAddresseeId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };
  if (user.id === safeAddresseeId) return { error: "Du kannst dir nicht selbst eine Anfrage senden" };

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: safeAddresseeId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Anfrage bereits gesendet" };
    return { error: error.message };
  }

  // Notify the addressee
  const { data: sender } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  await supabase.from("notifications").insert({
    user_id: safeAddresseeId,
    type: "friend_request",
    title: `${sender?.username ?? "Jemand"} möchte dein Freund sein`,
    body: null,
  });

  revalidatePath("/profile");
  revalidatePath("/sessions/create");
  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string) {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "Ungueltige Anfrage-ID" };
  const safeFriendshipId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", safeFriendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  // Notify the requester that their request was accepted
  const { data: friendship } = await supabase
    .from("friendships")
    .select("requester_id, profiles!friendships_requester_id_fkey(username)")
    .eq("id", safeFriendshipId)
    .single();

  const accepterUsername = (await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single()).data?.username ?? "Jemand";

  if (friendship?.requester_id) {
    await supabase.from("notifications").insert({
      user_id: friendship.requester_id,
      type: "friend_accepted",
      title: `${accepterUsername} hat deine Freundschaftsanfrage angenommen`,
      body: null,
    });
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function removeFriend(friendshipId: string) {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "Ungueltige Freundschafts-ID" };
  const safeFriendshipId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", safeFriendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/sessions/create");
  return { success: true };
}

export async function blockUser(friendshipId: string) {
  const parsed = uuidSchema.safeParse(friendshipId);
  if (!parsed.success) return { error: "Ungueltige Freundschafts-ID" };
  const safeFriendshipId = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "blocked", updated_at: new Date().toISOString() })
    .eq("id", safeFriendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
