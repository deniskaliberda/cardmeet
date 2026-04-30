"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseMutationError = {
  code?: string;
  message: string;
};

type WaitlistMutationResult = PromiseLike<{ error: SupabaseMutationError | null }>;

type WaitlistDeleteBuilder = {
  eq(column: "session_id" | "user_id", value: string): WaitlistDeleteBuilder & WaitlistMutationResult;
};

type WaitlistClient = {
  from(table: "session_waitlist"): {
    insert(row: { session_id: string; user_id: string }): WaitlistMutationResult;
    delete(): WaitlistDeleteBuilder;
  };
};

export async function joinSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { data, error } = await supabase.rpc("join_session", {
    p_session_id: sessionId,
  });

  if (error) return { error: error.message };

  const result = data?.[0];
  if (result && !result.success) {
    return { error: result.message ?? "Beitreten fehlgeschlagen" };
  }

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

  const { data, error } = await supabase.rpc("leave_session", {
    p_session_id: sessionId,
  });

  if (error) return { error: error.message };

  const result = data?.[0];
  if (result && !result.success) {
    return { error: result.message ?? "Verlassen fehlgeschlagen" };
  }

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

  const { data, error } = await supabase.rpc("kick_session_participant", {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  const result = data?.[0];
  if (result && !result.success) {
    return { error: result.message ?? "Entfernen fehlgeschlagen" };
  }

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

  const waitlist = supabase as unknown as WaitlistClient;
  const { error } = await waitlist.from("session_waitlist").insert({
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

  const waitlist = supabase as unknown as WaitlistClient;
  const { error } = await waitlist
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
