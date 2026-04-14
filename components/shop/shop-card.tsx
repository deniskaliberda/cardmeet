"use client";

import Link from "next/link";
import { MapPin, Users, CalendarDays, ExternalLink } from "lucide-react";
import { ShopTcgBadges } from "./shop-tcg-badges";
import { getTCG } from "@/lib/config/tcg";
import type { Shop } from "@/app/(app)/shops/actions";

type Props = {
  shop: Shop & { session_count: number };
};

export function ShopCard({ shop }: Props) {
  const primaryTcg = shop.tcgs[0] ? getTCG(shop.tcgs[0]) : null;
  const primaryColor = primaryTcg?.color ?? "#6366F1";

  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Top accent gradient bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: shop.tcgs.length > 1
            ? `linear-gradient(90deg, ${primaryColor}, ${getTCG(shop.tcgs[1])?.color ?? primaryColor}88)`
            : primaryColor,
        }}
      />

      <div className="flex flex-col gap-3 px-4 pb-4">
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
          {shop.session_count > 0 && (
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white shrink-0"
              style={{ background: primaryColor }}
            >
              <CalendarDays className="h-3 w-3" />
              {shop.session_count}
            </div>
          )}
        </div>

        {/* TCG badges */}
        <ShopTcgBadges tcgs={shop.tcgs} />

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
      </div>
    </Link>
  );
}
