import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TCG_LIST } from "@/lib/config/tcg";
import { MapPin, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-xl font-bold">CardMeet</span>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Anmelden
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Registrieren</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Finde Mitspieler.
            <br />
            <span className="text-primary">Starte eine Runde.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            CardMeet verbindet TCG-Spieler in deiner Naehe. Erstelle Sessions,
            finde Mitspieler und spiele — spontan oder geplant.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Kostenlos starten</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Anmelden
              </Button>
            </Link>
          </div>

          {/* TCG Badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {TCG_LIST.map((tcg) => (
              <Badge
                key={tcg.id}
                variant="outline"
                style={{ borderColor: tcg.color, color: tcg.color }}
              >
                {tcg.shortName}
              </Badge>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/50 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-3">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Standortbasiert</h3>
              <p className="text-sm text-muted-foreground">
                Finde Sessions und Spieler in deiner Naehe — egal wo du bist.
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Alle TCGs</h3>
              <p className="text-sm text-muted-foreground">
                Magic, Pokemon, Yu-Gi-Oh!, Lorcana, One Piece und mehr.
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Echtzeit-Chat</h3>
              <p className="text-sm text-muted-foreground">
                Kommuniziere mit deiner Gruppe direkt in der Session.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
