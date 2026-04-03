"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSessionSchema } from "@/lib/validations/session";

export async function createSession(formData: FormData) {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    tcg: formData.get("tcg"),
    format: formData.get("format"),
    power_level: formData.get("power_level") || undefined,
    max_players: formData.get("max_players"),
    city: formData.get("city"),
    location_name: formData.get("location_name") || undefined,
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    scheduled_at: formData.get("scheduled_at"),
  };

  const parsed = createSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht angemeldet" };
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      host_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      tcg: parsed.data.tcg,
      format: parsed.data.format,
      power_level: parsed.data.power_level ?? null,
      max_players: parsed.data.max_players,
      city: parsed.data.city,
      location_name: parsed.data.location_name ?? null,
      location: `SRID=4326;POINT(${parsed.data.lng} ${parsed.data.lat})`,
      scheduled_at: parsed.data.scheduled_at,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/sessions/${session.id}`);
}
