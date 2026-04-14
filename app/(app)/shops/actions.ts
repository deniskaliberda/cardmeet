"use server";

import { createClient } from "@/lib/supabase/server";

export type Shop = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  district: string | null;
  website: string | null;
  phone: string | null;
  tcgs: string[];
  has_play_space: boolean;
  play_space_seats: number | null;
  opening_hours: Record<string, string> | null;
  claimed_by: string | null;
  is_verified: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getShops(filterTcg?: string): Promise<Shop[]> {
  const supabase = await createClient();

  let query = supabase.from("shops").select("*").order("name");

  if (filterTcg) {
    query = query.contains("tcgs", [filterTcg]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Shop[];
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Shop;
}

export async function getShopSessions(shopId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*, profiles!sessions_host_id_fkey(username, avatar_url)")
    .eq("shop_id", shopId)
    .in("status", ["open", "full", "in_progress"])
    .order("scheduled_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getShopSessionCount(shopId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .in("status", ["open", "full", "in_progress"]);

  if (error) return 0;
  return count ?? 0;
}

export async function getAllShopsWithCounts(): Promise<
  (Shop & { session_count: number })[]
> {
  const shops = await getShops();

  const counts = await Promise.all(
    shops.map((shop) => getShopSessionCount(shop.id))
  );

  return shops.map((shop, i) => ({ ...shop, session_count: counts[i] }));
}
