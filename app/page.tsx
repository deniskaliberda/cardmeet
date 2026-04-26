import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import { FadeIn } from "@/components/landing/fade-in";
import { DynamicSessionBadge } from "@/components/landing/dynamic-session-badge";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { TCG_LIST } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";

export const revalidate = 60;

export default async function LandingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Load sessions + platform stats in parallel
  const now = new Date().toISOString();
  const [
    { data: sessions },
    { count: activeSessions },
    { count: userCount },
    { data: cityRows },
  ] = await Promise.all([
    supabase.rpc("nearby_sessions", { p_lat: 52.52, p_lng: 13.405, radius_km: 50 }),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "full"])
      .gt("scheduled_at", now),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("city")
      .not("city", "is", null)
      .gt("scheduled_at", now),
  ]);

  const cityCount = new Set((cityRows ?? []).map((r) => r.city)).size;
  const totalSessions = activeSessions ?? 0;
  const totalUsers = userCount ?? 0;

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

  // Fetch username for logged-in hero
  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = profile?.username ?? null;
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <div className="mx-auto max-w-screen-2xl px-4 pb-20 pt-8 sm:px-6">

        {/* ── Hero ── */}
        <section className="mb-10 text-center">
          {user ? (
            /* ── Logged-in hero ── */
            <div>
              <div
                className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-green-500"
                  style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
                />
                <DynamicSessionBadge total={totalSessions} />
              </div>
              <h1 className="mb-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Willkommen zurück{username ? `, ${username}` : ""}!
              </h1>
              <p className="mx-auto mb-8 max-w-md text-base text-muted-foreground">
                {totalSessions > 0
                  ? `${totalSessions} Session${totalSessions !== 1 ? "s" : ""} warten auf dich — spring direkt rein.`
                  : "Erstelle die erste Session in deiner Stadt."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/sessions">
                  <Button size="lg" className="px-8">Sessions entdecken</Button>
                </Link>
                <Link href="/my-sessions">
                  <Button size="lg" variant="outline" className="border-2 border-primary px-8 text-primary hover:bg-primary/5 hover:text-primary">
                    Meine Sessions
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Guest hero ── */
            <div>
              <div
                className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-green-500"
                  style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
                />
                <DynamicSessionBadge total={totalSessions} />
              </div>
              <h1 className="mb-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Finde TCG-Spieler{" "}
                <span
                  style={{
                    background: "var(--brand-gradient)",
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
                  <Button size="lg" className="px-8">Kostenlos registrieren</Button>
                </Link>
                <Link href="/sessions">
                  <Button size="lg" variant="outline" className="border-2 border-primary px-8 text-primary hover:bg-primary/5 hover:text-primary">
                    Sessions entdecken
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ── Social Proof Stats ── */}
        <FadeIn delay={100}>
          <section className="mb-10">
            <div className="mx-auto flex max-w-lg items-center justify-center gap-6 rounded-2xl border border-border bg-card px-6 py-4"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <StatPill value={totalSessions} label="aktive Sessions" />
              <div className="h-8 w-px bg-border" />
              <StatPill value={totalUsers} label="Spieler" />
              <div className="h-8 w-px bg-border" />
              <StatPill value={cityCount} label={cityCount === 1 ? "Stadt" : "Städte"} />
            </div>
          </section>
        </FadeIn>

        {/* ── Live Explorer ── */}
        <FadeIn delay={150}>
          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold">Sessions in deiner Nähe</h2>
                <p className="text-sm text-muted-foreground">
                  Berlin & Umland · 50 km Radius · Echtzeit
                </p>
              </div>
              <Link href="/sessions" className="text-sm font-medium text-primary hover:underline">
                Alle Sessions →
              </Link>
            </div>
            <LandingExplorer sessions={mappedSessions} />
          </section>
        </FadeIn>

        {/* ── How it works ── */}
        <FadeIn delay={0}>
          <section className="mb-12">
            <div className="mb-6 text-center">
              <span
                className="mono-eyebrow inline-block"
                style={{ color: "#FF4D8A" }}
              >
                In 3 Schritten zum Spiel
              </span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                So funktioniert CardMeet
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: "🗺️",
                  title: "Sessions auf der Karte finden",
                  desc: "Sieh auf einen Blick, wo in deiner Stadt gespielt wird — ohne Account nötig.",
                  accent: "linear-gradient(135deg, #0066FF, #5B3DFF)",
                  glow: "0 4px 16px rgba(0,102,255,0.30)",
                },
                {
                  step: "02",
                  icon: "🎯",
                  title: "LFG starten oder beitreten",
                  desc: "Sag wann & wo — wir matchen dich automatisch. Oder klick dich in eine offene Runde.",
                  accent: "linear-gradient(135deg, #5B3DFF, #FF4D8A)",
                  glow: "0 4px 16px rgba(91,61,255,0.40)",
                },
                {
                  step: "03",
                  icon: "👍",
                  title: "Spielen & Kudos vergeben",
                  desc: "Triff andere Spieler vor Ort, bau dein Netzwerk auf und gib am Ende einen Daumen hoch.",
                  accent: "linear-gradient(135deg, #FF4D8A, #FF6B35)",
                  glow: "0 4px 16px rgba(255,77,138,0.30)",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: "color-mix(in oklch, #5B3DFF 22%, var(--border))",
                    boxShadow: item.glow,
                  }}
                >
                  {/* Top gradient bar — mockup signature */}
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 top-0 h-[3px]"
                    style={{ background: item.accent }}
                  />
                  {/* Step number — big, mono, faint, mockup-style */}
                  <div
                    className="absolute right-5 top-4 text-3xl font-bold leading-none"
                    style={{
                      fontFamily: "var(--font-mono), 'Fira Code', monospace",
                      background: item.accent,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      opacity: 0.5,
                    }}
                  >
                    {item.step}
                  </div>
                  <div className="mb-4 text-4xl">{item.icon}</div>
                  <h3 className="mb-2 font-heading text-base font-bold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Supported TCGs ── */}
        <FadeIn delay={0}>
          <section className="mb-12">
            <h2 className="mb-6 text-center text-xl font-semibold">Unterstützte Spiele</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TCG_LIST.map((tcg) => (
                <div
                  key={tcg.id}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 bg-card p-5 transition-transform hover:-translate-y-0.5"
                  style={{
                    borderColor: `${tcg.color}40`,
                    boxShadow: `0 2px 8px ${tcg.color}10`,
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: `${tcg.color}18` }}
                  >
                    <TCGIcon tcgId={tcg.id} className="h-7 w-7" color={tcg.color} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: tcg.color }}>
                      {tcg.shortName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {tcg.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── CTA Banner (guests only) ── */}
        {!user && (
          <FadeIn delay={0}>
            <section
              className="rounded-2xl border-2 border-primary/20 px-8 py-12 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(0,102,255,0.04) 0%, rgba(0,194,168,0.04) 100%)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <h2 className="mb-2 text-2xl font-semibold">Bereit zum Spielen?</h2>
              <p className="mb-6 text-muted-foreground">
                Erstelle deinen kostenlosen Account und finde heute noch Mitspieler.
              </p>
              <Link href="/register">
                <Button size="lg" className="px-10">Jetzt kostenlos starten</Button>
              </Link>
            </section>
          </FadeIn>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tabular-nums">
        {value > 0 ? value.toLocaleString("de-DE") : "–"}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
