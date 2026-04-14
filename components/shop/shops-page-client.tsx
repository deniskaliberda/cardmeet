"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { TCG_LIST } from "@/lib/config/tcg";
import { ShopCard } from "./shop-card";
import type { Shop } from "@/app/(app)/shops/actions";

type Props = {
  shops: (Shop & { session_count: number })[];
};

export function ShopsPageClient({ shops }: Props) {
  const [activeTcg, setActiveTcg] = useState<string | null>(null);

  const filtered = activeTcg
    ? shops.filter((s) => s.tcgs.includes(activeTcg))
    : shops;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Store className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Game Shops</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Finde Spieleläden in deiner Nähe — dein Hub für TCG-Abende
        </p>
      </div>

      {/* TCG filter pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTcg(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
            !activeTcg
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Alle
        </button>
        {TCG_LIST.map((tcg) => (
          <button
            key={tcg.id}
            onClick={() => setActiveTcg(activeTcg === tcg.id ? null : tcg.id)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer"
            style={
              activeTcg === tcg.id
                ? {
                    backgroundColor: `${tcg.color}20`,
                    color: tcg.color,
                    border: `1px solid ${tcg.color}60`,
                  }
                : {
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                  }
            }
          >
            {tcg.shortName}
          </button>
        ))}
      </div>

      {/* Shop count */}
      <p className="mb-3 text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "Shop" : "Shops"}
        {activeTcg ? ` für ${TCG_LIST.find((t) => t.id === activeTcg)?.shortName}` : ""}
      </p>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          Keine Shops gefunden.
        </div>
      )}
    </div>
  );
}
