"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FriendOption = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  avg_rating: number | null;
};

export function FriendInviteGrid({
  friends,
  selected,
  onSelectionChange,
}: {
  friends: FriendOption[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  function toggle(userId: string) {
    if (selected.includes(userId)) {
      onSelectionChange(selected.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selected, userId]);
    }
  }

  if (friends.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Noch keine Freunde zum Einladen.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
        {friends.map((friend) => {
          const isSelected = selected.includes(friend.user_id);
          return (
            <button
              key={friend.user_id}
              type="button"
              onClick={() => toggle(friend.user_id)}
              className={cn(
                "rounded-xl p-3.5 text-center transition-all cursor-pointer",
                isSelected
                  ? "bg-[var(--surface-container-low)] border-2 border-primary"
                  : "bg-[var(--surface-container-low)] border-2 border-transparent hover:border-[var(--outline-variant)]"
              )}
            >
              <Avatar className="h-10 w-10 mx-auto mb-2">
                <AvatarFallback className="bg-primary text-white text-sm font-medium">
                  {friend.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium">{friend.username}</div>
              {friend.avg_rating != null && (
                <div className="flex items-center justify-center gap-0.5 text-xs text-muted-foreground mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {friend.avg_rating}
                </div>
              )}
              <div
                className={cn(
                  "mt-2.5 rounded-lg py-1.5 px-3 text-xs font-medium",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-card text-muted-foreground"
                )}
              >
                {isSelected ? "✓ Eingeladen" : "Klicken zum Einladen"}
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-4 rounded-xl bg-primary/10 border border-primary p-3.5">
          <div className="text-xs text-muted-foreground">
            <strong>{selected.length} Freunde</strong> werden per
            Email/Push benachrichtigt. Die Session ist trotzdem oeffentlich
            sichtbar.
          </div>
        </div>
      )}
    </div>
  );
}
