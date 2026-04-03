import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Users, Calendar } from "lucide-react";
import { getTCG, getPowerLevel } from "@/lib/config/tcg";

type SessionCardProps = {
  session: {
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
    profiles?: { username: string; avatar_url: string | null } | null;
  };
};

export function SessionCard({ session }: SessionCardProps) {
  const tcg = getTCG(session.tcg);
  const powerLevel =
    session.power_level != null
      ? getPowerLevel(session.tcg, session.format, session.power_level)
      : undefined;

  const scheduledDate = new Date(session.scheduled_at);
  const isFull = session.status === "full";

  return (
    <Link href={`/sessions/${session.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base leading-tight">
                {session.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                von {session.profiles?.username ?? "Unbekannt"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {powerLevel && (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: powerLevel.color }}
                  title={`${powerLevel.name}: ${powerLevel.description}`}
                >
                  {powerLevel.level}
                </div>
              )}
              <Badge
                style={{ backgroundColor: tcg?.color, color: "#fff" }}
              >
                {tcg?.shortName ?? session.tcg}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {format(scheduledDate, "EEEE, d. MMMM · HH:mm", { locale: de })} Uhr
            </span>
          </div>
          {(session.location_name || session.city) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{session.location_name ?? session.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {session.current_players}/{session.max_players} Spieler
              {isFull && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Voll
                </Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
