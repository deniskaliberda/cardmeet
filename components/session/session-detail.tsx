"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, Calendar, Clock } from "lucide-react";
import { getTCG, getPowerLevel } from "@/lib/config/tcg";
import { joinSession, leaveSession, cancelSession } from "@/app/(app)/sessions/actions";
import { toast } from "sonner";

type SessionDetailProps = {
  session: {
    id: string;
    title: string;
    description: string | null;
    tcg: string;
    format: string;
    power_level: number | null;
    max_players: number;
    current_players: number;
    status: string;
    city: string | null;
    location_name: string | null;
    scheduled_at: string;
    profiles?: { id: string; username: string; avatar_url: string | null } | null;
  };
  participants: {
    user_id: string;
    profiles: { id: string; username: string; avatar_url: string | null } | null;
  }[];
  currentUserId: string;
  isHost: boolean;
  isParticipant: boolean;
};

export function SessionDetail({
  session,
  participants,
  currentUserId,
  isHost,
  isParticipant,
}: SessionDetailProps) {
  const tcg = getTCG(session.tcg);
  const powerLevel =
    session.power_level != null
      ? getPowerLevel(session.tcg, session.format, session.power_level)
      : undefined;

  const scheduledDate = new Date(session.scheduled_at);
  const isCancelled = session.status === "cancelled";
  const isFull = session.status === "full";
  const canJoin = !isHost && !isParticipant && !isFull && !isCancelled;

  async function handleJoin() {
    const result = await joinSession(session.id);
    if (result.error) toast.error(result.error);
    else toast.success("Du bist der Session beigetreten!");
  }

  async function handleLeave() {
    const result = await leaveSession(session.id);
    if (result.error) toast.error(result.error);
    else toast.success("Du hast die Session verlassen");
  }

  async function handleCancel() {
    const result = await cancelSession(session.id);
    if (result.error) toast.error(result.error);
    else toast.success("Session wurde abgesagt");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{session.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              von {session.profiles?.username ?? "Unbekannt"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge style={{ backgroundColor: tcg?.color, color: "#fff" }}>
              {tcg?.shortName ?? session.tcg}
            </Badge>
            {powerLevel && (
              <Badge
                variant="outline"
                style={{ borderColor: powerLevel.color, color: powerLevel.color }}
              >
                {powerLevel.name}
              </Badge>
            )}
            {isCancelled && <Badge variant="destructive">Abgesagt</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.description && (
          <p className="text-sm">{session.description}</p>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(scheduledDate, "EEEE, d. MMMM yyyy", { locale: de })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {format(scheduledDate, "HH:mm", { locale: de })} Uhr
          </div>
          {(session.location_name || session.city) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {session.location_name ?? session.city}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {session.current_players}/{session.max_players} Spieler
          </div>
        </div>

        <Separator />

        {/* Participants */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Teilnehmer</h3>
          <div className="flex flex-wrap gap-2">
            {/* Host */}
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {session.profiles?.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{session.profiles?.username}</span>
              <Badge variant="secondary" className="text-xs">Host</Badge>
            </div>
            {/* Participants */}
            {participants.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {p.profiles?.username?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{p.profiles?.username}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex gap-2">
            {canJoin && (
              <Button onClick={handleJoin} className="flex-1">
                Beitreten
              </Button>
            )}
            {isParticipant && !isHost && (
              <Button variant="outline" onClick={handleLeave}>
                Verlassen
              </Button>
            )}
            {isHost && (
              <Button variant="destructive" onClick={handleCancel}>
                Absagen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
