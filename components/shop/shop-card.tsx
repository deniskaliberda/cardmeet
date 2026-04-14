"use client";

import Link from "next/link";
import { MapPin, Users, CalendarDays, ExternalLink } from "lucide-react";
import { ShopTcgBadges } from "./shop-tcg-badges";
import type { Shop } from "@/app/(app)/shops/actions";

type Props = {
  shop: Shop & { session_count: number };
};

export function ShopCard({ shop }: Props) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {shop.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {shop.district !== shop.city ? shop.district : shop.address}
            </span>
          </div>
        </div>

        {/* Session count badge */}
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
          <CalendarDays className="h-3 w-3" />
          {shop.session_count}
        </div>
      </div>

      {/* TCG badges */}
      <ShopTcgBadges tcgs={shop.tcgs} />

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          {shop.has_play_space && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {shop.play_space_seats
                ? `${shop.play_space_seats} Plätze`
                : "Spielbereich"}
            </span>
          )}
        </div>
        {shop.website && (
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </Link>
  );
}
