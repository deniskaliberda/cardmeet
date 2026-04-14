import { createClient } from "@/lib/supabase/server";
import { CreateSessionForm } from "@/components/session/create-session-form";

export const metadata = { title: "Session erstellen" };

export default async function CreateSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop: shopSlug } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let friends: { user_id: string; username: string; avatar_url: string | null }[] = [];

  if (user) {
    const { data: friendships } = await supabase
      .from("friendships")
      .select(
        "requester_id, addressee_id, profiles!friendships_addressee_id_fkey(id, username, avatar_url), profiles!friendships_requester_id_fkey(id, username, avatar_url)"
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    friends = (friendships ?? [])
      .map((f) => {
        const isRequester = f.requester_id === user.id;
        const profile = isRequester
          ? (f as any)["profiles!friendships_addressee_id_fkey"]
          : (f as any)["profiles!friendships_requester_id_fkey"];
        return {
          user_id: profile?.id ?? "",
          username: profile?.username ?? "Unbekannt",
          avatar_url: profile?.avatar_url ?? null,
        };
      })
      .filter((f) => f.user_id);
  }

  // Load shops for the location picker
  // lat/lng are generated columns (ST_Y/ST_X) — querying location directly returns WKB hex
  const { data: shopsData } = await supabase
    .from("shops")
    .select("id, slug, name, address, city, district, tcgs, lat, lng")
    .eq("has_play_space", true)
    .order("name");

  const shopOptions = (shopsData ?? []).map((s: any) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    address: s.address,
    city: s.city,
    district: s.district,
    tcgs: s.tcgs ?? [],
    lat: s.lat ?? 52.52,
    lng: s.lng ?? 13.405,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session erstellen</h1>
        <p className="text-muted-foreground">
          Erstelle eine Spielrunde und finde Mitspieler
        </p>
      </div>
      <CreateSessionForm
        friends={friends}
        shops={shopOptions}
        preselectedShopSlug={shopSlug}
      />
    </div>
  );
}
