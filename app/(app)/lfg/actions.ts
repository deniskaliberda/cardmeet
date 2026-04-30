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

type CompleteLfgMatchResult = {
  success: boolean;
  result_status: "waiting" | "matched" | "unauthenticated" | "not_found" | "forbidden" | string;
  lfg_post_id: string;
  session_id: string | null;
  message: string | null;
};

export async function createLfgPost(input: CreateLfgInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const parsed = createLfgSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };

  const { count } = await supabase
    .from("lfg_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if ((count ?? 0) >= 3) return { error: "Maximal 3 aktive LFG-Posts erlaubt" };

  const now = new Date();
  const nextDay = findNextMatchingDay(parsed.data.days_of_week, now);
  const availableFrom = new Date(nextDay);
  availableFrom.setHours(parsed.data.time_from, 0, 0, 0);
  const availableTo = new Date(nextDay);
  availableTo.setHours(parsed.data.time_to, 0, 0, 0);

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
    .select("id, tcg, format")
    .single();

  if (insertError || !post) return { error: insertError?.message ?? "Fehler beim Erstellen" };

  const tcgConfig = getTCG(post.tcg);
  const formatConfig = post.format ? getFormat(post.tcg, post.format) : tcgConfig?.formats[0];
  const maxPlayers = formatConfig?.playerCount.default ?? 4;
  const sessionTitle = `LFG: ${tcgConfig?.shortName ?? post.tcg}${post.format ? ` ${formatConfig?.name ?? post.format}` : ""}`;

  const { data: completionRows, error: completionError } = await supabase.rpc("complete_lfg_match", {
    p_post_id: post.id,
    p_session_title: sessionTitle,
    p_session_format: post.format ?? formatConfig?.id ?? "casual",
    p_max_players: Math.max(maxPlayers, 2),
  });

  if (completionError) {
    return { error: completionError.message };
  }

  const completion = (completionRows as CompleteLfgMatchResult[] | null)?.[0];

  if (!completion?.success) {
    return { error: completion?.message ?? "LFG-Matching fehlgeschlagen" };
  }

  if (completion.result_status !== "matched" || !completion.session_id) {
    revalidatePath("/dashboard");
    return { success: true, status: "waiting" as const, postId: post.id };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  return { success: true, status: "matched" as const, sessionId: completion.session_id };
}

function findNextMatchingDay(daysOfWeek: number[], from: Date): Date {
  const currentDay = from.getDay();
  for (let offset = 0; offset < 7; offset++) {
    const candidateJsDay = (currentDay + offset) % 7;
    const ourDay = candidateJsDay === 0 ? 6 : candidateJsDay - 1;
    if (daysOfWeek.includes(ourDay)) {
      const result = new Date(from);
      result.setDate(from.getDate() + offset);
      return result;
    }
  }
  return from;
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
