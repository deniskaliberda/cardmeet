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
      <div className="mb-6 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 264 / 15%), oklch(0.75 0.18 160 / 10%))" }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <Store className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Game Shops</h1>
            <p className="text-xs text-muted-foreground">
              Finde Spieleläden in deiner Nähe — dein Hub für TCG-Abende
            </p>
          </div>
        </div>
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
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold">Keine Shops gefunden</p>
          <p className="mt-1 text-sm text-muted-foreground">Versuche einen anderen Filter.</p>
        </div>
      )}
    </div>
  );
}
