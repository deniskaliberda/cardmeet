"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, X } from "lucide-react";
import { removeParticipant } from "@/app/(app)/sessions/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Participant = {
  user_id: string;
  status: string;
  profiles: { id?: string; username: string; avatar_url: string | null } | null;
};

export function ParticipantList({
  participants,
  hostId,
  maxPlayers,
  currentUserId,
  isHost,
  sessionId,
}: {
  participants: Participant[];
  hostId: string;
  maxPlayers: number;
  currentUserId: string;
  isHost: boolean;
  sessionId: string;
}) {
  const slotsLeft = maxPlayers - participants.length - 1; // -1 for host

  return (
    <>
      <div className="text-sm font-medium mb-3">
        👥 Teilnehmer ({participants.length + 1}/{maxPlayers})
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {/* Host */}
        <ParticipantRow
          userId={hostId}
          username={
            participants.find((p) => p.user_id === hostId)?.profiles?.username ??
            "Host"
          }
          isHost
          isCurrentUser={hostId === currentUserId}
          canRemove={false}
          sessionId={sessionId}
        />

        {/* Joined participants (excluding host) */}
        {participants
          .filter((p) => p.user_id !== hostId)
          .map((p) => (
            <ParticipantRow
              key={p.user_id}
              userId={p.user_id}
              username={p.profiles?.username ?? "Unbekannt"}
              isHost={false}
              isCurrentUser={p.user_id === currentUserId}
              canRemove={isHost}
              sessionId={sessionId}
            />
          ))}

        {/* Empty slots */}
        {slotsLeft > 0 && (
          <div className="mt-auto rounded-lg bg-[var(--surface-container-low)] border-2 border-dashed border-[var(--outline-variant)] p-3 text-center">
            <div className="text-xs text-muted-foreground">
              🎴 {slotsLeft} {slotsLeft === 1 ? "Platz" : "Plaetze"} frei
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ParticipantRow({
  userId,
  username,
  isHost,
  isCurrentUser,
  canRemove,
  sessionId,
}: {
  userId: string;
  username: string;
  isHost: boolean;
  isCurrentUser: boolean;
  canRemove: boolean;
  sessionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeParticipant(sessionId, userId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${username} entfernt`);
        router.refresh();
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg p-2",
        isCurrentUser
          ? "bg-primary/8 border-2 border-primary/30"
          : "bg-[var(--surface-container-low)]"
      )}
    >
      {/* Avatar with online dot */}
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarFallback
            className={cn(
              "text-[10px] font-medium",
              isCurrentUser
                ? "bg-primary text-white border-2 border-primary"
                : "bg-primary text-white"
            )}
          >
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator (placeholder) */}
        <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#006b5c] border-2 border-[var(--surface-container-low)]" />
      </div>

      {/* Name + rating */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">
          {isCurrentUser ? "Du" : username}
        </div>
        <div className="text-[10px] text-muted-foreground">⭐ 4.5</div>
      </div>

      {/* Host badge or remove button */}
      {isHost && (
        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-medium shrink-0">
          HOST
        </span>
      )}
      {canRemove && !isHost && (
        <button
          onClick={handleRemove}
          disabled={pending}
          className="text-[10px] px-1.5 py-0.5 border border-destructive rounded-md text-destructive cursor-pointer hover:bg-destructive/10 shrink-0 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
