import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import { LandingFeatures } from "@/components/landing/landing-features";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default async function LandingPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.rpc("nearby_sessions", {
    lat: 52.52,
    lng: 13.405,
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
    lat: s.lat as number,
    lng: s.lng as number,
    scheduled_at: s.scheduled_at as string,
    host_username: (s.host_username as string) ?? null,
    host_avatar: (s.host_avatar as string) ?? null,
  }));

  const features = [
    {
      icon: "🗺️",
      title: "Sessions auf der Karte",
      desc: "Sieh sofort wo in deiner Stadt gespielt wird — ohne Account",
    },
    {
      icon: "🔔",
      title: "Dauerhafte Session-Alerts",
      desc: "Werde benachrichtigt wenn eine passende Session erstellt wird",
    },
    {
      icon: "⭐",
      title: "Bewertungen & Vertrauen",
      desc: "Verifizierte Spieler, Ratings und Community-Feedback",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-8 sm:px-6">

        {/* Hero */}
        <section className="grid gap-10 pb-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: Tagline + CTA */}
          <div className="flex flex-col justify-center">
            <h1 className="mb-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Deine TCG-Community.<br />
              <span
                style={{
                  background: "linear-gradient(135deg, #0066FF, #00C2A8, #FF6B35)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Lokal. Einfach.
              </span>
            </h1>
            <p className="mb-8 max-w-md text-base leading-relaxed text-muted-foreground">
              Finde oder erstelle Spielsessions in deiner Nähe — ohne Reddit-Posts,
              Discord-Gruppen oder endlose Suche.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="px-6">
                  ✨ Kostenlos registrieren
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary px-6 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  Einloggen
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Feature highlights */}
          <div className="flex flex-col gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-5"
              >
                <div className="flex-shrink-0 text-3xl">{f.icon}</div>
                <div>
                  <div className="mb-0.5 font-medium">{f.title}</div>
                  <div className="text-sm text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Explorer: TCG-Filter + Karte + Liste */}
        <LandingExplorer sessions={mappedSessions} />

        {/* Stats */}
        <LandingFeatures sessionCount={mappedSessions.length} />
      </div>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} CardMeet</span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
