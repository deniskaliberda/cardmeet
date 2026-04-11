"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(
  sessionId: string,
  revieweeId: string,
  rating: number,
  comment: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet" };
  if (rating < 1 || rating > 5) return { error: "Bewertung muss zwischen 1 und 5 sein" };
  if (user.id === revieweeId) return { error: "Du kannst dich nicht selbst bewerten" };

  const { error } = await supabase.from("reviews").insert({
    session_id: sessionId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Du hast diesen Spieler fuer diese Session bereits bewertet" };
    }
    return { error: error.message };
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath(`/profile`);
  return { success: true };
}
