"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, UserMinus, Check, X } from "lucide-react";
import { acceptFriendRequest, removeFriend } from "@/app/(app)/friends/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Friend = {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  avg_rating: number | null;
  status: "pending" | "accepted";
  is_incoming: boolean;
};

export function FriendList({
  friends,
  pendingRequests,
}: {
  friends: Friend[];
  pendingRequests: Friend[];
}) {
  return (
    <div className="space-y-6">
      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">
            Anfragen ({pendingRequests.length})
          </h4>
          <div className="flex flex-col gap-2">
            {pendingRequests.map((req) => (
              <PendingRequestCard key={req.friendship_id} request={req} />
            ))}
          </div>
        </div>
      )}

      {/* Friends grid */}
      <div>
        <h4 className="text-sm font-medium mb-3">
          Freunde ({friends.length})
        </h4>
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Noch keine Freunde. Finde Mitspieler in Sessions!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {friends.map((friend) => (
              <FriendCard key={friend.friendship_id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FriendCard({ friend }: { friend: Friend }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeFriend(friend.friendship_id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${friend.username} entfernt`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-container-low)] p-3 tonal-transition hover:bg-[var(--surface-container)]">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-white text-xs font-medium">
            {friend.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online placeholder */}
        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#006b5c] border-2 border-[var(--surface-container-low)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{friend.username}</div>
        {friend.avg_rating != null && (
          <div className="flex items-center gap-0.5 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            {friend.avg_rating}
          </div>
        )}
      </div>
      <button
        onClick={handleRemove}
        disabled={pending}
        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
        title="Freund entfernen"
      >
        <UserMinus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PendingRequestCard({ request }: { request: Friend }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptFriendRequest(request.friendship_id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${request.username} als Freund hinzugefuegt`);
        router.refresh();
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await removeFriend(request.friendship_id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Anfrage abgelehnt");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-primary/5 border-2 border-primary/20 p-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary text-white text-xs font-medium">
          {request.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{request.username}</div>
        <div className="text-[11px] text-muted-foreground">
          {request.is_incoming ? "Moechte dein Freund sein" : "Anfrage gesendet"}
        </div>
      </div>
      {request.is_incoming && (
        <div className="flex gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-7 px-2.5 rounded-lg text-xs"
            onClick={handleAccept}
            disabled={pending}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs border-destructive text-destructive"
            onClick={handleDecline}
            disabled={pending}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
