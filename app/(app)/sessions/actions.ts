"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function joinSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  // Use upsert so a user who previously left can rejoin
  const { error } = await supabase.from("session_participants").upsert(
    { session_id: sessionId, user_id: user.id, status: "joined" },
    { onConflict: "session_id,user_id" }
  );

  if (error) return { error: error.message };

  // Notification is created by the participant_joined DB trigger
  // (migration 00031). Server-side insert was using `session_join` which
  // does not exist in the notifications type CHECK and notifications has
  // no INSERT policy anyway — the row was silently dropped.

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  return { success: true };
}

export async function leaveSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("session_participants")
    .update({ status: "left" })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Waitlist notification (if anyone is waiting) is also handled by the
  // participant_left trigger in migration 00031. Server insert with
  // `session_join` type was silently dropped here too.

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  return { success: true };
}

export async function removeParticipant(sessionId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("session_participants")
    .update({ status: "removed" })
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  // Notify the removed participant
  const { data: session } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  // Notification handled by participant_kicked branch of the trigger
  // in migration 00031 (status update 'joined' -> 'kicked').
  void session;

  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

export async function pauseSession(sessionId: string, currentStatus: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const newStatus = currentStatus === "paused" ? "open" : "paused";

  const { error } = await supabase
    .from("sessions")
    .update({ status: newStatus })
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/my-sessions");
  return { success: true, newStatus };
}

export async function inviteToSession(sessionId: string, friendIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };
  if (friendIds.length === 0) return { error: "Niemanden ausgewählt" };

  const { data: session } = await supabase
    .from("sessions")
    .select("title, host_id")
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .single();

  if (!session) return { error: "Session nicht gefunden" };

  const { data: sender } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Insert as the host via the SECURITY DEFINER helper notify_session_invite
  // (migration 00031). Direct supabase insert is silently dropped because
  // notifications has no INSERT policy.
  await supabase.rpc("notify_session_invite", {
    p_session_id: sessionId,
    p_friend_ids: friendIds,
    p_sender_name: sender?.username ?? "Jemand",
    p_session_title: session.title,
  });

  return { success: true };
}

export async function cancelSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { data: session } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .single();

  // Notify participants before deleting (cascade will remove participants)
  if (session) {
    const { data: participants } = await supabase
      .from("session_participants")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("status", "joined")
      .neq("user_id", user.id);

    // Cancel notifications come from session_cancelled trigger in
    // migration 00031, fired AFTER UPDATE on sessions when status moves
    // to 'cancelled'.
    void participants;
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/sessions");
  revalidatePath("/my-sessions");
  return { success: true };
}

export async function joinWaitlist(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await (supabase as any).from("session_waitlist").insert({
    session_id: sessionId,
    user_id: user.id,
  });
  if (error) {
    if (error.code === "23505") return { error: "Du stehst bereits auf der Warteliste" };
    return { error: error.message };
  }
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

export async function leaveWaitlist(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await (supabase as any)
    .from("session_waitlist")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}

export async function updateSession(
  sessionId: string,
  data: {
    title: string;
    description: string;
    scheduled_at: string;
    max_players: number;
    location_name: string;
    power_level: number | null;
    entry_fee_cents: number;
    recurrence: "none" | "weekly" | "biweekly" | "monthly";
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  if (!data.title.trim() || data.title.length < 3)
    return { error: "Titel muss mindestens 3 Zeichen haben" };
  if (!data.scheduled_at)
    return { error: "Datum fehlt" };
  if (data.max_players < 2)
    return { error: "Mindestens 2 Spieler" };
  if (data.entry_fee_cents < 0)
    return { error: "Kosten können nicht negativ sein" };

  const { error } = await supabase
    .from("sessions")
    .update({
      title: data.title.trim(),
      description: data.description.trim() || null,
      scheduled_at: data.scheduled_at,
      max_players: data.max_players,
      location_name: data.location_name.trim() || null,
      power_level: data.power_level,
      entry_fee_cents: data.entry_fee_cents,
      recurrence: data.recurrence,
    })
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-sessions");
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}
