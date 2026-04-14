"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLfgSchema } from "@/lib/validations/lfg";
import { getTCG, getFormat } from "@/lib/config/tcg";

type CreateLfgInput = {
  tcg: string;
  format?: string;
  power_level?: number;
  max_radius_km?: number;
  lat: number;
  lng: number;
  location_label?: string;
  days_of_week: number[];
  time_from: number;
  time_to: number;
};

export async function createLfgPost(input: CreateLfgInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const parsed = createLfgSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };

  // Max 3 active posts per user
  const { count } = await supabase
    .from("lfg_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if ((count ?? 0) >= 3) return { error: "Maximal 3 aktive LFG-Posts erlaubt" };

  // Calculate a representative available_from/to for the next matching day
  const now = new Date();
  const nextDay = findNextMatchingDay(parsed.data.days_of_week, now);
  const availableFrom = new Date(nextDay);
  availableFrom.setHours(parsed.data.time_from, 0, 0, 0);
  const availableTo = new Date(nextDay);
  availableTo.setHours(parsed.data.time_to, 0, 0, 0);

  // Insert ONE LFG post covering all selected days
  const { data: post, error: insertError } = await supabase
    .from("lfg_posts")
    .insert({
      user_id: user.id,
      tcg: parsed.data.tcg,
      format: parsed.data.format ?? null,
      power_level: parsed.data.power_level ?? null,
      max_radius_km: parsed.data.max_radius_km,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      location_label: parsed.data.location_label ?? null,
      days_of_week: parsed.data.days_of_week,
      time_from: parsed.data.time_from,
      time_to: parsed.data.time_to,
      available_from: availableFrom.toISOString(),
      available_to: availableTo.toISOString(),
    })
    .select("id, tcg, format, power_level, lat, lng, location_label, available_from, available_to")
    .single();

  if (insertError || !post) return { error: insertError?.message ?? "Fehler beim Erstellen" };

  // Find matches
  const { data: matches } = await supabase.rpc("find_lfg_matches", {
    new_post_id: post.id,
  });

  if (!matches || matches.length === 0) {
    revalidatePath("/dashboard");
    return { success: true, status: "waiting" as const, postId: post.id };
  }

  // Verify time overlap >= 1 hour
  const validMatches = matches.filter((m: any) => {
    const overlapFrom = Math.max(parsed.data.time_from, m.post_available_from ? new Date(m.post_available_from).getHours() : 0);
    const overlapTo = Math.min(parsed.data.time_to, m.post_available_to ? new Date(m.post_available_to).getHours() : 24);
    return (overlapTo - overlapFrom) >= 1;
  });

  if (validMatches.length === 0) {
    revalidatePath("/dashboard");
    return { success: true, status: "waiting" as const, postId: post.id };
  }

  // Re-check that matched posts are still active (race condition guard)
  const matchPostIds = validMatches.map((m: any) => m.post_id);
  const { data: stillActive } = await supabase
    .from("lfg_posts")
    .select("id")
    .in("id", matchPostIds)
    .eq("status", "active");

  const confirmedMatches = validMatches.filter((m: any) =>
    stillActive?.some((a: any) => a.id === m.post_id)
  );

  if (confirmedMatches.length === 0) {
    revalidatePath("/dashboard");
    return { success: true, status: "waiting" as const, postId: post.id };
  }

  // Calculate centroid of all players
  const allPlayers = [
    { lat: post.lat, lng: post.lng },
    ...confirmedMatches.map((m: any) => ({ lat: m.post_lat, lng: m.post_lng })),
  ];
  const centroidLat = allPlayers.reduce((sum, p) => sum + p.lat, 0) / allPlayers.length;
  const centroidLng = allPlayers.reduce((sum, p) => sum + p.lng, 0) / allPlayers.length;

  // Find nearest shop
  const { data: shops } = await supabase.rpc("find_nearest_shop_for_lfg", {
    p_lat: centroidLat,
    p_lng: centroidLng,
    p_tcg: post.tcg,
    p_radius_km: 15,
  });
  const shop = shops?.[0] ?? null;

  // Calculate scheduled_at — next matching day at midpoint of time window
  const scheduledAt = new Date(nextDay);
  const midHour = Math.floor((parsed.data.time_from + parsed.data.time_to) / 2);
  scheduledAt.setHours(midHour, 0, 0, 0);

  // Get max_players from format config
  const tcgConfig = getTCG(post.tcg);
  const formatConfig = post.format ? getFormat(post.tcg, post.format) : tcgConfig?.formats[0];
  const maxPlayers = formatConfig?.playerCount.default ?? 4;

  const sessionLat = shop?.shop_lat ?? centroidLat;
  const sessionLng = shop?.shop_lng ?? centroidLng;

  // Auto-create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      host_id: user.id,
      title: `LFG: ${tcgConfig?.shortName ?? post.tcg}${post.format ? ` ${formatConfig?.name ?? post.format}` : ""}`,
      tcg: post.tcg,
      format: post.format ?? formatConfig?.id ?? null,
      power_level: post.power_level ?? null,
      max_players: Math.max(maxPlayers, allPlayers.length),
      city: shop?.shop_city ?? post.location_label ?? "Berlin",
      location_name: shop?.shop_name ?? null,
      location: `SRID=4326;POINT(${sessionLng} ${sessionLat})`,
      scheduled_at: scheduledAt.toISOString(),
      shop_id: shop?.shop_id ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: "Session konnte nicht erstellt werden" };
  }

  // Add all players as participants
  const allUserIds = [user.id, ...confirmedMatches.map((m: any) => m.post_user_id)];
  await supabase.from("session_participants").insert(
    allUserIds.map((uid: string) => ({
      session_id: session.id,
      user_id: uid,
      status: "joined",
    }))
  );

  // Mark all LFG posts as matched
  const allPostIds = [post.id, ...confirmedMatches.map((m: any) => m.post_id)];
  await supabase
    .from("lfg_posts")
    .update({ status: "matched", matched_session_id: session.id })
    .in("id", allPostIds);

  // Notify all matched players
  await supabase.from("notifications").insert(
    allUserIds.map((uid: string) => ({
      user_id: uid,
      type: "lfg_match",
      title: "Match gefunden!",
      body: `${allUserIds.length} Spieler für ${tcgConfig?.shortName ?? post.tcg}${shop ? " bei " + shop.shop_name : ""}`,
      data: { session_id: session.id },
    }))
  );

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  return { success: true, status: "matched" as const, sessionId: session.id };
}

function findNextMatchingDay(daysOfWeek: number[], from: Date): Date {
  const currentDay = from.getDay(); // 0=Sun
  for (let offset = 0; offset < 7; offset++) {
    const candidateJsDay = (currentDay + offset) % 7;
    // Convert JS day (0=Sun) to our format (0=Mo, 6=So)
    const ourDay = candidateJsDay === 0 ? 6 : candidateJsDay - 1;
    if (daysOfWeek.includes(ourDay)) {
      const result = new Date(from);
      result.setDate(from.getDate() + offset);
      return result;
    }
  }
  return from; // fallback
}

export async function cancelLfgPost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("lfg_posts")
    .update({ status: "cancelled" })
    .eq("id", postId)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyActiveLfgPosts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("lfg_posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return data ?? [];
}
