import { createClient } from "@/lib/supabase/server";
import { SessionList } from "@/components/session/session-list";
import { SessionFilters } from "@/components/session/session-filters";

export const metadata = { title: "Sessions finden" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tcg = typeof params.tcg === "string" ? params.tcg : undefined;
  const format = typeof params.format === "string" ? params.format : undefined;

  const supabase = await createClient();

  // Fetch sessions (without geo-filter for now, will add client-side geolocation)
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      `
      *,
      profiles!sessions_host_id_fkey (username, avatar_url)
    `
    )
    .in("status", ["open", "full"])
    .gt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(50);

  const filteredSessions = (sessions ?? []).filter((s) => {
    if (tcg && s.tcg !== tcg) return false;
    if (format && s.format !== format) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sessions finden</h1>
        <p className="text-muted-foreground">
          Finde Mitspieler in deiner Naehe
        </p>
      </div>

      <SessionFilters activeTcg={tcg} activeFormat={format} />

      <SessionList sessions={filteredSessions} />
    </div>
  );
}
