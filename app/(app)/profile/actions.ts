"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations/profile";

export async function updateProfile(formData: FormData) {
  const raw = {
    display_name: formData.get("display_name") || undefined,
    bio: formData.get("bio") || undefined,
    city: formData.get("city") || undefined,
    preferred_tcgs: formData.getAll("preferred_tcgs").filter(Boolean) as string[],
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name ?? null,
      bio: parsed.data.bio ?? null,
      city: parsed.data.city,
      preferred_tcgs: parsed.data.preferred_tcgs,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
