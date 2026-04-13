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

  // Notify the host
  const { data: session } = await supabase
    .from("sessions")
    .select("host_id, title, profiles(username)")
    .eq("id", sessionId)
    .single();

  if (session?.host_id && session.host_id !== user.id) {
    const profiles = session.profiles as { username: string } | { username: string }[] | null;
    const joinerUsername = (Array.isArray(profiles) ? profiles[0] : profiles)?.username ?? "Jemand";
    await supabase.from("notifications").insert({
      user_id: session.host_id,
      type: "session_join",
      title: `${joinerUsername} ist deiner Session beigetreten`,
      body: session.title,
    });
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

  const { error } = await supabase
    .from("session_participants")
    .update({ status: "left" })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

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

  if (session) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "session_removed",
      title: "Du wurdest aus einer Session entfernt",
      body: session.title,
    });
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

  await supabase.from("notifications").insert(
    friendIds.map((friendId) => ({
      user_id: friendId,
      type: "session_invite",
      title: `${sender?.username ?? "Jemand"} lädt dich ein`,
      body: session.title,
    }))
  );

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

    if (participants && participants.length > 0) {
      await supabase.from("notifications").insert(
        participants.map((p) => ({
          user_id: p.user_id,
          type: "session_cancelled",
          title: "Session wurde abgesagt",
          body: session.title,
        }))
      );
    }
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

export async function updateSession(
  sessionId: string,
  data: {
    title: string;
    description: string;
    scheduled_at: string;
    max_players: number;
    location_name: string;
    power_level: number | null;
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

  const { error } = await supabase
    .from("sessions")
    .update({
      title: data.title.trim(),
      description: data.description.trim() || null,
      scheduled_at: data.scheduled_at,
      max_players: data.max_players,
      location_name: data.location_name.trim() || null,
      power_level: data.power_level,
    })
    .eq("id", sessionId)
    .eq("host_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-sessions");
  revalidatePath(`/sessions/${sessionId}`);
  return { success: true };
}
