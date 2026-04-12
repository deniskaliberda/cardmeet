import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { TCG_LIST } from "@/lib/config/tcg";

export const revalidate = 60;

export default async function LandingPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("nearby_sessions", {
    p_lat: 52.52,
    p_lng: 13.405,
    radius_km: 50,
  });

  const mappedSessions = (sessions ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    title: s.title as string,
    tcg: s.tcg as string,
    format: s.format as string,
    max_players: s.max_players as number,
    current_players: s.current_players as number,
    status: s.status as string,
    city: (s.city as string) ?? null,
    location_name: (s.location_name as string) ?? null,
    postal_code: (s.postal_code as string) ?? null,
    lat: s.lat as number,
    lng: s.lng as number,
    scheduled_at: s.scheduled_at as string,
    host_username: (s.host_username as string) ?? null,
    host_avatar: (s.host_avatar as string) ?? null,
  }));

  const sessionCount = mappedSessions.length;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <div className="mx-auto max-w-screen-2xl px-4 pb-20 pt-8 sm:px-6">

        {/* ── Hero ── */}
        <section className="mb-10 text-center">
          <div
            className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-green-500"
              style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
            {sessionCount > 0
              ? `${sessionCount} aktive Session${sessionCount !== 1 ? "s" : ""} in Berlin`
              : "Jetzt in Berlin starten"}
          </div>

          <h1 className="mb-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Finde TCG-Spieler{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #0066FF 0%, #00C2A8 55%, #FF6B35 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in deiner Stadt.
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            CardMeet verbindet Kartenspiel-Fans lokal. Finde offene Sessions auf der
            Karte, tritt bei oder erstelle deine eigene — ohne Discord-Gruppen,
            Reddit-Posts oder endlose Suche.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Kostenlos registrieren
              </Button>
            </Link>
            <Link href="/sessions">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary px-8 text-primary hover:bg-primary/5 hover:text-primary"
              >
                Sessions entdecken
              </Button>
            </Link>
          </div>
        </section>

        {/* ── Live Map ── */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Sessions in deiner Nähe</h2>
              <p className="text-sm text-muted-foreground">
                Berlin & Umland · 50 km Radius · Echtzeit
              </p>
            </div>
            <Link
              href="/sessions"
              className="text-sm font-medium text-primary hover:underline"
            >
              Alle Sessions →
            </Link>
          </div>
          <LandingExplorer sessions={mappedSessions} />
        </section>

        {/* ── How it works ── */}
        <section className="mb-12">
          <h2 className="mb-6 text-center text-xl font-semibold">
            So funktioniert CardMeet
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: "🗺️",
                title: "Sessions auf der Karte finden",
                desc: "Sieh auf einen Blick, wo in deiner Stadt gespielt wird — ohne Account nötig.",
              },
              {
                step: "02",
                icon: "✋",
                title: "Beitreten oder erstellen",
                desc: "Tritt einer offenen Runde bei oder erstelle deine eigene Session in wenigen Sekunden.",
              },
              {
                step: "03",
                icon: "⭐",
                title: "Spielen & bewerten",
                desc: "Triff andere Spieler vor Ort, bau dein Netzwerk auf und hinterlasse ein ehrliches Rating.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border-2 border-border bg-card p-6"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="mb-4 text-3xl">{item.icon}</div>
                <div
                  className="absolute right-5 top-5 text-xs font-semibold"
                  style={{
                    fontFamily: "var(--font-mono), 'Fira Code', monospace",
                    color: "var(--primary)",
                    opacity: 0.35,
                  }}
                >
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supported TCGs ── */}
        <section className="mb-12">
          <h2 className="mb-4 text-center text-xl font-semibold">
            Unterstützte Spiele
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TCG_LIST.map((tcg) => (
              <div
                key={tcg.id}
                className="rounded-full border-2 bg-card px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor: `${tcg.color}55`,
                  color: tcg.color,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {tcg.shortName}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section
          className="rounded-2xl border-2 border-primary/20 px-8 py-12 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,102,255,0.04) 0%, rgba(0,194,168,0.04) 100%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <h2 className="mb-2 text-2xl font-semibold">Bereit zum Spielen?</h2>
          <p className="mb-6 text-muted-foreground">
            Erstelle deinen kostenlosen Account und finde heute noch Mitspieler.
          </p>
          <Link href="/register">
            <Button size="lg" className="px-10">
              Jetzt kostenlos starten
            </Button>
          </Link>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
