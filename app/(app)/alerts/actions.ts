"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAlert(data: {
  tcg: string;
  format?: string;
  max_radius_km: number;
  days_of_week: number[];
  lat: number;
  lng: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase.from("session_alerts").insert({
    user_id: user.id,
    tcg: data.tcg,
    format: data.format || null,
    max_radius_km: data.max_radius_km,
    days_of_week: data.days_of_week,
    lat: data.lat,
    lng: data.lng,
    status: "active",
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleAlert(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { data: alert } = await supabase
    .from("session_alerts")
    .select("status")
    .eq("id", alertId)
    .eq("user_id", user.id)
    .single();

  if (!alert) return { error: "Alert nicht gefunden" };

  const newStatus = alert.status === "active" ? "paused" : "active";
  const { error } = await supabase
    .from("session_alerts")
    .update({ status: newStatus })
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAlert(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("session_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}
