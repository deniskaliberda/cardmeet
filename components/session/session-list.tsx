import { SessionCard } from "./session-card";

type Session = {
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

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Keine Sessions gefunden</p>
        <p className="text-muted-foreground">
          Erstelle die erste Session und finde Mitspieler!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
