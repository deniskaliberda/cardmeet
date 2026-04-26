import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bulk-fetch the recommendation count for a list of profile IDs.
 *
 * Returns a Map<profileId, count>. The historic field name `avg_rating` is
 * kept on the call sites for compatibility, but since migration 00011 the
 * value is a count of thumbs-up reviews, not an average.
 *
 * Uses a single SELECT instead of one RPC call per user (n+1).
 */
export async function getProfileRatings(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (profileIds.length === 0) return counts;

  const unique = Array.from(new Set(profileIds.filter(Boolean)));
  if (unique.length === 0) return counts;

  const { data } = await supabase
    .from("reviews")
    .select("reviewed_id")
    .in("reviewed_id", unique)
    .eq("recommended", true);

  for (const row of (data ?? []) as { reviewed_id: string }[]) {
    counts.set(row.reviewed_id, (counts.get(row.reviewed_id) ?? 0) + 1);
  }

  return counts;
}
