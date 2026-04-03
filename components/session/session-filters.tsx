"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";

export function SessionFilters({
  activeTcg,
  activeFormat,
}: {
  activeTcg?: string;
  activeFormat?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
      if (key === "tcg") params.delete("format");
    } else {
      params.set(key, value);
    }
    router.push(`/sessions?${params.toString()}`);
  }

  const selectedTcg = activeTcg ? getTCG(activeTcg) : undefined;

  return (
    <div className="space-y-3">
      {/* TCG Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={!activeTcg ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter("tcg", null)}
        >
          Alle
        </Badge>
        {TCG_LIST.map((tcg) => (
          <Badge
            key={tcg.id}
            variant={activeTcg === tcg.id ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            style={
              activeTcg === tcg.id
                ? { backgroundColor: tcg.color, color: "#fff" }
                : undefined
            }
            onClick={() => setFilter("tcg", tcg.id)}
          >
            {tcg.shortName}
          </Badge>
        ))}
      </div>

      {/* Format Filter (only if TCG is selected) */}
      {selectedTcg && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={!activeFormat ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("format", null)}
          >
            Alle Formate
          </Badge>
          {selectedTcg.formats.map((format) => (
            <Badge
              key={format.id}
              variant={activeFormat === format.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("format", format.id)}
            >
              {format.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
