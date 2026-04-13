"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDMConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { conversations: [] };

  type RawDM = {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    read: boolean;
    created_at: string;
    sender: { id: string; username: string; avatar_url: string | null } | null;
    receiver: { id: string; username: string; avatar_url: string | null } | null;
  };

  // All DMs involving this user, newest first
  const { data: rawMessages } = await supabase
    .from("direct_messages" as any)
    .select(
      "id, sender_id, receiver_id, content, read, created_at, " +
      "sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url), " +
      "receiver:profiles!direct_messages_receiver_id_fkey(id, username, avatar_url)"
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(200);

  const messages = (rawMessages ?? []) as unknown as RawDM[];

  // Group by conversation partner (keep only first/latest per partner)
  const seen = new Set<string>();
  const conversations: {
    partner: { id: string; username: string; avatar_url: string | null };
    lastMessage: { content: string; created_at: string; isMine: boolean };
    unreadCount: number;
  }[] = [];

  const unreadCounts = new Map<string, number>();
  for (const msg of messages ?? []) {
    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    if (msg.receiver_id === user.id && !msg.read) {
      unreadCounts.set(partnerId, (unreadCounts.get(partnerId) ?? 0) + 1);
    }
  }

  for (const msg of messages ?? []) {
    const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);
    const partner = msg.sender_id === user.id
      ? (msg.sender as any)
      : (msg.receiver as any);
    conversations.push({
      partner: { id: partner.id, username: partner.username, avatar_url: partner.avatar_url },
      lastMessage: {
        content: msg.content,
        created_at: msg.created_at,
        isMine: msg.sender_id === user.id,
      },
      unreadCount: unreadCounts.get(partnerId) ?? 0,
    });
  }

  return { conversations };
}

export async function getDMMessages(friendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { messages: [] };

  const { data } = await (supabase as any)
    .from("direct_messages")
    .select("id, sender_id, content, read, created_at")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),` +
      `and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(100);

  // Mark unread messages as read
  await (supabase as any)
    .from("direct_messages")
    .update({ read: true })
    .eq("sender_id", friendId)
    .eq("receiver_id", user.id)
    .eq("read", false);

  return { messages: (data ?? []) as { id: string; sender_id: string; content: string; read: boolean; created_at: string }[] };
}

export async function sendDM(receiverId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };
  if (!content.trim()) return { error: "Nachricht leer" };

  const { error } = await (supabase as any).from("direct_messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: content.trim(),
  });

  if (error) return { error: error.message };

  // Push notification to receiver
  const { data: sender } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  await supabase.from("notifications").insert({
    user_id: receiverId,
    type: "chat_message",
    title: sender?.username ?? "Jemand",
    body: content.trim().slice(0, 100),
  });

  return { success: true };
}

export async function getUnreadDMCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await (supabase as any)
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("read", false);

  return count ?? 0;
}
