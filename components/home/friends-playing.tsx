"use client";

import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users } from "lucide-react";
import { getTCG } from "@/lib/config/tcg";
import { Button } from "@/components/ui/button";

type FriendSession = {
  friend_username: string;
  friend_avatar_url: string | null;
  session_id: string;
  session_title: string;
  session_tcg: string;
  session_format: string | null;
  session_scheduled_at: string;
  session_city: string | null;
  session_location_name: string | null;
  session_current_players: number;
  session_max_players: number;
  shop_name: string | null;
};

export function FriendsPlaying({ sessions }: { sessions: FriendSession[] }) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Freunde spielen</h3>
      </div>

      <div className="flex flex-col gap-2">
        {sessions.map((fs) => {
          const tcg = getTCG(fs.session_tcg);
          const scheduled = new Date(fs.session_scheduled_at);
          const free = fs.session_max_players - fs.session_current_players;

          return (
            <Link
              key={`${fs.friend_username}-${fs.session_id}`}
              href={`/sessions/${fs.session_id}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:bg-card active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${tcg?.color ?? "#666"}18, var(--card))`,
              }}
            >
              {/* Friend avatar */}
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {fs.friend_avatar_url ? (
                    <img
                      src={fs.friend_avatar_url}
                      alt={fs.friend_username}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    fs.friend_username.slice(0, 2).toUpperCase()
                  )}
                </div>
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-card">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </span>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">
                    {fs.friend_username}
                  </span>
                  <span className="text-xs text-muted-foreground">spielt</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span style={{ color: tcg?.color }}>{tcg?.shortName}</span>
                  {" · "}
                  {fs.session_title}
                  {fs.shop_name && ` · @ ${fs.shop_name}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(scheduled, "EEE d. MMM, HH:mm", { locale: de })} Uhr
                  {fs.session_city && ` · ${fs.session_city}`}
                </p>
              </div>

              {/* Join hint */}
              {free > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg text-xs h-8 px-3 group-hover:border-primary group-hover:text-primary"
                >
                  Beitreten
                </Button>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
