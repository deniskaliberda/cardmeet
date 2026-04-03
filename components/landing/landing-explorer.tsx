"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { TCG_LIST, getTCG, getPowerLevel } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { useExplorerStore } from "@/lib/stores/explorer-store";
import type { MapSession } from "@/components/map/session-map";

const SessionMap = dynamic(
  () => import("@/components/map/session-map").then((m) => m.SessionMap),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">Karte wird geladen...</div> }
);

const MUTED_TCG_COLORS: Record<string, string> = {
  magic: "#b8944a",
  pokemon: "#baa84a",
  yugioh: "#8a4a4a",
  lorcana: "#6a6a9e",
  onepiece: "#8a4a4a",
  "flesh-and-blood": "#7a5a8a",
  "weiss-schwarz": "#5a7a8a",
};

function getMutedColor(tcgId: string): string {
  return MUTED_TCG_COLORS[tcgId] ?? "#6b7280";
}

export function LandingExplorer({ sessions }: { sessions: MapSession[] }) {
  const { selectedSessionId, activeTcg, setSelected, setHovered, setTcgFilter } =
    useExplorerStore();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = activeTcg
    ? sessions.filter((s) => s.tcg === activeTcg)
    : sessions;

  // Scroll to selected card in list
  useEffect(() => {
    if (!selectedSessionId || !listRef.current) return;
    const card = listRef.current.querySelector(`[data-session-id="${selectedSessionId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSessionId]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)]">
      {/* Left panel — list */}
      <div className="flex w-full flex-col border-r lg:w-[420px] lg:min-w-[380px]">
        {/* Tagline + CTA */}
        <div className="border-b px-4 py-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Finde Mitspieler in deiner Naehe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} offene{" "}
            {filtered.length === 1 ? "Session" : "Sessions"} in Deutschland
          </p>
          <div className="mt-3">
            <Link href="/register">
              <Button size="sm">Kostenlos starten</Button>
            </Link>
          </div>
        </div>

        {/* TCG Filter pills */}
        <div className="flex flex-wrap gap-1.5 border-b px-4 py-3">
          <Badge
            variant={!activeTcg ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setTcgFilter(null)}
          >
            Alle
          </Badge>
          {TCG_LIST.map((tcg) => {
            const muted = getMutedColor(tcg.id);
            const isActive = activeTcg === tcg.id;
            return (
              <Badge
                key={tcg.id}
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer text-xs transition-colors"
                style={
                  isActive
                    ? { backgroundColor: muted, borderColor: muted, color: "#fff" }
                    : { borderColor: muted, color: muted }
                }
                onClick={() => setTcgFilter(isActive ? null : tcg.id)}
              >
                {tcg.shortName}
              </Badge>
            );
          })}
        </div>

        {/* Session list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium">Keine Sessions gefunden</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Erstelle die erste Session!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((session) => (
                <ExplorerSessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSessionId === session.id}
                  onSelect={() =>
                    setSelected(
                      selectedSessionId === session.id ? null : session.id
                    )
                  }
                  onHoverStart={() => setHovered(session.id)}
                  onHoverEnd={() => setHovered(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — map */}
      <div className="h-[350px] lg:h-full lg:flex-1">
        <SessionMap sessions={filtered} />
      </div>
    </div>
  );
}

function ExplorerSessionCard({
  session,
  isSelected,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: {
  session: MapSession;
  isSelected: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const tcg = getTCG(session.tcg);
  const mutedColor = getMutedColor(session.tcg);
  const scheduledDate = new Date(session.scheduled_at);
  const powerLevel =
    session.format && "power_level" in session
      ? getPowerLevel(session.tcg, session.format, (session as { power_level?: number }).power_level ?? 0)
      : undefined;

  return (
    <button
      type="button"
      data-session-id={session.id}
      className={`w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
        isSelected ? "bg-accent/70" : ""
      }`}
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{session.title}</p>
          <p className="text-xs text-muted-foreground">
            von {session.host_username ?? "Unbekannt"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5" style={{ borderColor: mutedColor }}>
          <TCGIcon tcgId={session.tcg} className="h-3.5 w-3.5" color={mutedColor} />
          <span className="text-[11px] font-medium" style={{ color: mutedColor }}>
            {tcg?.shortName ?? session.tcg}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })} Uhr
        </span>
        {(session.location_name || session.city) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {session.location_name ?? session.city}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {session.current_players}/{session.max_players}
        </span>
      </div>
    </button>
  );
}
