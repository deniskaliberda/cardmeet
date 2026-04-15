import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SessionCardCompact } from "@/components/session/session-card-compact";

type Session = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  max_players: number;
  current_players: number;
  city: string | null;
  location_name: string | null;
  scheduled_at: string;
};

export function UpcomingSessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Deine Sessions
        </h2>
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Du hast noch keine Sessions. Finde dein naechstes Spiel!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Deine Sessions
        </h2>
        <Link
          href="/sessions"
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Alle
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4">
        {sessions.map((session) => (
          <SessionCardCompact key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}
