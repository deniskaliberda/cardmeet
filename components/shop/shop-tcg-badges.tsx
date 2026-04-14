"use client";

import { getTCG } from "@/lib/config/tcg";

export function ShopTcgBadges({ tcgs }: { tcgs: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tcgs.map((tcgId) => {
        const tcg = getTCG(tcgId);
        if (!tcg) return null;
        return (
          <span
            key={tcgId}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight"
            style={{
              backgroundColor: `${tcg.color}20`,
              color: tcg.color,
              border: `1px solid ${tcg.color}40`,
            }}
          >
            {tcg.shortName}
          </span>
        );
      })}
    </div>
  );
}
