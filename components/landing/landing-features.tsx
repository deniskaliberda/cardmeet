import { MapPin, Users, Zap } from "lucide-react";

export function LandingFeatures() {
  return (
    <section className="border-t bg-muted/30 py-14">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:grid-cols-3">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Standortbasiert</h3>
          <p className="text-xs text-muted-foreground">
            Finde Sessions und Spieler in deiner Naehe.
          </p>
        </div>
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Alle TCGs</h3>
          <p className="text-xs text-muted-foreground">
            Magic, Pokemon, Yu-Gi-Oh!, Lorcana, One Piece und mehr.
          </p>
        </div>
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Zap className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Echtzeit-Chat</h3>
          <p className="text-xs text-muted-foreground">
            Kommuniziere mit deiner Gruppe direkt in der Session.
          </p>
        </div>
      </div>
    </section>
  );
}
