"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinSession } from "@/app/(app)/sessions/actions";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

type JoinButtonProps = {
  sessionId: string;
  isParticipant: boolean;
  isFull: boolean;
  isHost: boolean;
  size?: "sm" | "default";
};

export function JoinButton({
  sessionId,
  isParticipant,
  isFull,
  isHost,
  size = "sm",
}: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();

  if (isHost || isParticipant) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
        <Check className="h-3 w-3" />
        Dabei
      </span>
    );
  }

  if (isFull) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        Voll
      </span>
    );
  }

  function handleJoin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await joinSession(sessionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Du bist dabei!");
      }
    });
  }

  return (
    <Button
      size={size}
      onClick={handleJoin}
      disabled={isPending}
      className="shrink-0"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        "Beitreten"
      )}
    </Button>
  );
}
