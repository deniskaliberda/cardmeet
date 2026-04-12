"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(
  sessionId: string,
  revieweeId: string,
  tags: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };
  if (user.id === revieweeId) return { error: "Du kannst dich nicht selbst bewerten" };

  const { error } = await supabase.from("reviews").insert({
    session_id: sessionId,
    reviewer_id: user.id,
    reviewed_id: revieweeId,
    recommended: true,
    tags,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Du hast diesen Spieler für diese Session bereits bewertet" };
    }
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/profile");
  return { success: true };
}
