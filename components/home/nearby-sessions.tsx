import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users, ChevronRight } from "lucide-react";
import { getTCG, getPowerLevel } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { JoinButton } from "@/components/session/join-button";

type NearbySession = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  power_level: number | null;
  max_players: number;
  current_players: number;
  status: string;
  city: string | null;
  location_name: string | null;
  scheduled_at: string;
  host_id: string;
  profiles?: { username: string; avatar_url: string | null } | null;
};

export function NearbySessions({
  sessions,
  currentUserId,
  joinedSessionIds,
}: {
  sessions: NearbySession[];
  currentUserId: string;
  joinedSessionIds: Set<string>;
}) {
  if (sessions.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sessions in deiner Naehe
        </h2>
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Sessions in deiner Naehe. Erstelle die erste!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sessions in deiner Naehe
        </h2>
        <Link
          href="/sessions"
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Alle anzeigen
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => {
          const tcg = getTCG(session.tcg);
          const scheduledDate = new Date(session.scheduled_at);
          const isHost = session.host_id === currentUserId;
          const isParticipant = joinedSessionIds.has(session.id);
          const isFull = session.status === "full";

          return (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:bg-accent/80"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1 rounded-full border px-2 py-0.5"
                    style={{ borderColor: tcg?.color }}
                  >
                    <TCGIcon tcgId={session.tcg} className="h-3.5 w-3.5" color={tcg?.color} />
                    <span className="text-xs font-medium" style={{ color: tcg?.color }}>
                      {tcg?.shortName ?? session.tcg}
                    </span>
                  </div>
                </div>
                <p className="line-clamp-1 text-sm font-semibold">{session.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })}
                  </span>
                  {(session.location_name || session.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{session.location_name ?? session.city}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {session.current_players}/{session.max_players}
                  </span>
                </div>
              </div>
              <JoinButton
                sessionId={session.id}
                isHost={isHost}
                isParticipant={isParticipant}
                isFull={isFull}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
