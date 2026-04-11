import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users } from "lucide-react";
import { getTCG } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";

type CompactSession = {
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

export function SessionCardCompact({ session }: { session: CompactSession }) {
  const tcg = getTCG(session.tcg);
  const scheduledDate = new Date(session.scheduled_at);

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex w-[260px] shrink-0 snap-start flex-col gap-2.5 rounded-xl border bg-card p-3.5 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full border px-2 py-0.5"
          style={{ borderColor: tcg?.color }}
        >
          <TCGIcon tcgId={session.tcg} className="h-3.5 w-3.5" color={tcg?.color} />
          <span className="text-xs font-medium" style={{ color: tcg?.color }}>
            {tcg?.shortName ?? session.tcg}
          </span>
        </div>
      </div>

      <p className="line-clamp-1 text-sm font-semibold">{session.title}</p>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })}</span>
        </div>
        {(session.location_name || session.city) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{session.location_name ?? session.city}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {session.current_players}/{session.max_players} Spieler
          </span>
        </div>
      </div>
    </Link>
  );
}
