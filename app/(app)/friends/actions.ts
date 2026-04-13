"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };
  if (user.id === addresseeId) return { error: "Du kannst dir nicht selbst eine Anfrage senden" };

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Anfrage bereits gesendet" };
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/sessions/create");
  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/sessions/create");
  return { success: true };
}

export async function blockUser(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "blocked", updated_at: new Date().toISOString() })
    .eq("id", friendshipId);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
