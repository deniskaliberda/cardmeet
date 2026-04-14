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
  available_from: string;
  available_to: string;
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

  // Insert the LFG post
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
      available_from: parsed.data.available_from,
      available_to: parsed.data.available_to,
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

  // Check overlap >= 60 minutes
  const validMatches = matches.filter((m: any) => {
    const overlapStart = Math.max(
      new Date(post.available_from).getTime(),
      new Date(m.post_available_from).getTime()
    );
    const overlapEnd = Math.min(
      new Date(post.available_to).getTime(),
      new Date(m.post_available_to).getTime()
    );
    return (overlapEnd - overlapStart) >= 60 * 60 * 1000;
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

  // Calculate scheduled_at from overlap window
  const allFromTimes = [
    new Date(post.available_from).getTime(),
    ...confirmedMatches.map((m: any) => new Date(m.post_available_from).getTime()),
  ];
  const allToTimes = [
    new Date(post.available_to).getTime(),
    ...confirmedMatches.map((m: any) => new Date(m.post_available_to).getTime()),
  ];
  const overlapStart = Math.max(...allFromTimes);
  const overlapEnd = Math.min(...allToTimes);
  const scheduledAt = new Date((overlapStart + overlapEnd) / 2);

  // Get max_players from format config
  const tcgConfig = getTCG(post.tcg);
  const formatConfig = post.format ? getFormat(post.tcg, post.format) : tcgConfig?.formats[0];
  const maxPlayers = formatConfig?.playerCount.default ?? 4;

  // Auto-create session
  const sessionLat = shop?.shop_lat ?? centroidLat;
  const sessionLng = shop?.shop_lng ?? centroidLng;

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
  const { data: poster } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

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
