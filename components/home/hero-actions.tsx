import Link from "next/link";
import { Search, Plus } from "lucide-react";

export function HeroActions({ openSessionCount }: { openSessionCount: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/entdecken"
        className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Search className="h-7 w-7 text-primary" />
        <div>
          <p className="text-base font-bold">Spiel finden</p>
          <p className="text-xs text-muted-foreground">
            {openSessionCount > 0
              ? `${openSessionCount} offene ${openSessionCount === 1 ? "Session" : "Sessions"}`
              : "Sessions entdecken"}
          </p>
        </div>
      </Link>

      <Link
        href="/sessions/create"
        className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-7 w-7 text-primary" />
        <div>
          <p className="text-base font-bold">Spiel erstellen</p>
          <p className="text-xs text-muted-foreground">Starte eine Runde</p>
        </div>
      </Link>
    </div>
  );
}
