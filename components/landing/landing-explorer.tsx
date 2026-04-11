"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users } from "lucide-react";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";
import { useExplorerStore } from "@/lib/stores/explorer-store";
import type { MapSession } from "@/components/map/session-map";

const SessionMap = dynamic(
  () => import("@/components/map/session-map").then((m) => m.SessionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Karte wird geladen...
      </div>
    ),
  }
);

export function LandingExplorer({ sessions }: { sessions: MapSession[] }) {
  const { selectedSessionId, activeTcg, setSelected, setHovered, setTcgFilter } =
    useExplorerStore();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = activeTcg
    ? sessions.filter((s) => s.tcg === activeTcg)
    : sessions;

  useEffect(() => {
    if (!selectedSessionId || !listRef.current) return;
    const card = listRef.current.querySelector(
      `[data-session-id="${selectedSessionId}"]`
    );
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSessionId]);

  return (
    <div className="grid grid-cols-[3fr_7fr] gap-5" style={{ height: "560px" }}>

      {/* Left: search + filters + list */}
      <div className="flex min-h-0 flex-col gap-3">

        {/* TCG Filter pills */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          <FilterPill label="Alle" active={!activeTcg} onClick={() => setTcgFilter(null)} />
          {TCG_LIST.filter((tcg) => ["magic", "pokemon", "yugioh", "onepiece"].includes(tcg.id)).map((tcg) => (
            <FilterPill
              key={tcg.id}
              label={tcg.shortName}
              active={activeTcg === tcg.id}
              color={tcg.color}
              onClick={() => setTcgFilter(activeTcg === tcg.id ? null : tcg.id)}
            />
          ))}
        </div>

        {/* Session count */}
        <div className="flex-shrink-0 text-xs text-muted-foreground">
          {filtered.length} Session{filtered.length !== 1 ? "s" : ""} gefunden
        </div>

        {/* Session list */}
        <div ref={listRef} className="sessions-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium">Keine Sessions gefunden</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Erstelle die erste Session!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((session) => (
                <ExplorerSessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSessionId === session.id}
                  onSelect={() =>
                    setSelected(selectedSessionId === session.id ? null : session.id)
                  }
                  onHoverStart={() => setHovered(session.id)}
                  onHoverEnd={() => setHovered(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Map – starts at the very top, full height */}
      <div
        className="overflow-hidden rounded-2xl border-2 border-border"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <SessionMap sessions={filtered} />
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  const activeColor = color ?? "#0066FF";
  return (
    <button
      onClick={onClick}
      className="rounded-full border-2 px-3.5 py-1 text-xs font-semibold transition-all"
      style={
        active
          ? { background: `${activeColor}22`, borderColor: activeColor, color: activeColor }
          : { background: "transparent", borderColor: "var(--border)", color: "var(--muted-foreground)" }
      }
    >
      {label}
    </button>
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
  const scheduledDate = new Date(session.scheduled_at);
  const free = session.max_players - session.current_players;
  const isFull = free <= 0;
  const isAlmostFull = free === 1 && !isFull;

  const slotsStyle = isFull
    ? { bg: "rgba(229,62,62,0.08)", border: "rgba(229,62,62,0.25)", color: "#E53E3E" }
    : isAlmostFull
    ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#F59E0B" }
    : { bg: "rgba(0,168,120,0.08)", border: "rgba(0,168,120,0.25)", color: "#00A878" };

  return (
    <button
      type="button"
      data-session-id={session.id}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 bg-card p-3.5 text-left transition-all duration-200 hover:translate-x-0.5 hover:border-primary hover:shadow-[0_4px_16px_rgba(0,102,255,0.08)]"
      style={{
        borderColor: isSelected ? "var(--primary)" : "var(--border)",
        background: isSelected ? "rgba(0,102,255,0.04)" : "var(--card)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-primary transition-opacity duration-200 group-hover:opacity-100"
        style={{ opacity: isSelected ? 1 : 0 }}
        aria-hidden
      />

      {/* Header */}
      <div className="mb-2">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p
          className="text-[11px]"
          style={{
            color: tcg?.color ?? "#6B7280",
            fontFamily: "var(--font-mono), 'Fira Code', monospace",
            fontWeight: 300,
          }}
        >
          {tcg?.shortName ?? session.tcg}: {session.format}
        </p>
      </div>

      {/* Meta */}
      <div className="mb-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })} Uhr</span>
        </div>
        {(session.location_name || session.city) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{session.location_name ?? session.city}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <div
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
          style={{ background: slotsStyle.bg, borderColor: slotsStyle.border, color: slotsStyle.color }}
        >
          <Users className="h-3 w-3" />
          {isFull ? "Session voll" : `${free} von ${session.max_players} frei`}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            {(session.host_username ?? "??").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-medium">{session.host_username ?? "Unbekannt"}</span>
        </div>
      </div>
    </button>
  );
}
