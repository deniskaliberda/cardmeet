"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, CalendarDays, Clock, MapPin, Users, X } from "lucide-react";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";
import { useExplorerStore } from "@/lib/stores/explorer-store";
import type { DateFilter } from "@/lib/stores/explorer-store";
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

// ── Date / Time helpers ──────────────────────────────────────────────────────

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

function getDateRange(filter: DateFilter): { from: Date; to: Date } | null {
  if (filter === "all") return null;
  const today = dayStart(new Date());
  switch (filter) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "tomorrow": {
      const t = addDays(today, 1);
      return { from: t, to: addDays(t, 1) };
    }
    case "weekend": {
      // next Saturday (or today if it IS Saturday)
      const dow = today.getDay(); // 0=Sun,6=Sat
      const daysToSat = dow === 6 ? 0 : (6 - dow + 7) % 7 || 7;
      const sat = addDays(today, daysToSat);
      return { from: sat, to: addDays(sat, 2) }; // Sat + Sun
    }
    case "week":
      return { from: today, to: addDays(today, 7) };
    default: {
      // specific "YYYY-MM-DD"
      const [y, m, d] = filter.split("-").map(Number);
      const start = new Date(y, m - 1, d);
      return { from: start, to: addDays(start, 1) };
    }
  }
}

function matchesDate(session: MapSession, filter: DateFilter): boolean {
  const range = getDateRange(filter);
  if (!range) return true;
  const d = new Date(session.scheduled_at);
  return d >= range.from && d < range.to;
}

function matchesFromMinutes(session: MapSession, fromMinutes: number | null): boolean {
  if (fromMinutes === null) return true;
  const d = new Date(session.scheduled_at);
  const sessionMinutes = d.getHours() * 60 + d.getMinutes();
  return sessionMinutes >= fromMinutes;
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "today", label: "Heute" },
  { id: "tomorrow", label: "Morgen" },
  { id: "weekend", label: "Wochenende" },
  { id: "week", label: "Diese Woche" },
];

// ── Main component ────────────────────────────────────────────────────────────

export function LandingExplorer({
  sessions,
  locationBar,
  center,
  radius,
}: {
  sessions: MapSession[];
  locationBar?: React.ReactNode;
  center?: { lat: number; lng: number };
  radius?: number;
}) {
  const {
    selectedSessionId,
    activeTcg,
    dateFilter,
    fromMinutes,
    setSelected,
    setHovered,
    setTcgFilter,
    setDateFilter,
    setFromMinutes,
  } = useExplorerStore();

  const timeInputRef = useRef<HTMLInputElement>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const filtered = sessions
    .filter((s) => !activeTcg || s.tcg === activeTcg)
    .filter((s) => matchesDate(s, dateFilter))
    .filter((s) => matchesFromMinutes(s, fromMinutes));

  useEffect(() => {
    if (!selectedSessionId || !listRef.current) return;
    const card = listRef.current.querySelector(
      `[data-session-id="${selectedSessionId}"]`
    );
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSessionId]);

  // Label for a specific-date filter chip
  const isSpecificDate =
    dateFilter !== "all" &&
    !["today", "tomorrow", "weekend", "week"].includes(dateFilter);
  const specificDateLabel = isSpecificDate
    ? (() => {
        const [y, m, d] = dateFilter.split("-").map(Number);
        return format(new Date(y, m - 1, d), "d. MMM", { locale: de });
      })()
    : null;

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setDateFilter(e.target.value);
    }
  }

  return (
    <div className="grid grid-cols-[3fr_7fr] gap-5" style={{ height: "560px" }}>

      {/* Left: location bar + filters + list */}
      <div className="flex min-h-0 flex-col gap-3">

        {/* Location bar slot */}
        {locationBar}

        {/* ── Date filter ── */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          {DATE_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.id}
              label={opt.label}
              active={dateFilter === opt.id}
              onClick={() => setDateFilter(opt.id)}
            />
          ))}
          {/* Specific date picker */}
          <div className="relative">
            <button
              type="button"
              title="Datum wählen"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 transition-all"
              style={
                specificDateLabel
                  ? {
                      background: "rgba(0,102,255,0.13)",
                      borderColor: "var(--primary)",
                      color: "var(--primary)",
                    }
                  : {
                      background: "transparent",
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }
              }
            >
              <CalendarDays className="h-3 w-3" />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              min={new Date().toISOString().slice(0, 10)}
              onChange={handleDateInput}
            />
          </div>
          {/* Show specific date chip if selected */}
          {specificDateLabel && (
            <FilterPill
              label={specificDateLabel}
              active
              onClick={() => setDateFilter("all")}
              closeable
            />
          )}
        </div>

        {/* ── From-time picker ── */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-medium">Ab</span>
          {fromMinutes !== null ? (
            <button
              type="button"
              onClick={() => setFromMinutes(null)}
              className="flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-semibold transition-all"
              style={{
                background: "rgba(0,102,255,0.13)",
                borderColor: "var(--primary)",
                color: "var(--primary)",
              }}
            >
              {minutesToLabel(fromMinutes)} Uhr
              <X className="h-2.5 w-2.5 opacity-70" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => timeInputRef.current?.showPicker?.()}
              className="flex items-center gap-1 rounded-full border-2 border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
            >
              Uhrzeit wählen
            </button>
          )}
          <input
            ref={timeInputRef}
            type="time"
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            onChange={(e) => {
              if (e.target.value) {
                const [h, m] = e.target.value.split(":").map(Number);
                setFromMinutes(h * 60 + m);
              }
            }}
          />
        </div>

        {/* TCG Filter pills */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          <FilterPill label="Alle" active={!activeTcg} onClick={() => setTcgFilter(null)} />
          {TCG_LIST.map((tcg) => (
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="font-medium">Keine Sessions gefunden</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Andere Filter versuchen oder Session erstellen!
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

      {/* Right: Map */}
      <div
        className="overflow-hidden rounded-2xl border-2 border-border"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <SessionMap sessions={filtered} center={center} radius={radius} />
      </div>
    </div>
  );
}

// ── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  color,
  onClick,
  small,
  closeable,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
  small?: boolean;
  closeable?: boolean;
}) {
  const activeColor = color ?? "#0066FF";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border-2 font-semibold transition-all"
      style={{
        fontSize: small ? "10px" : "11px",
        padding: small ? "2px 10px" : "3px 12px",
        ...(active
          ? { background: `${activeColor}22`, borderColor: activeColor, color: activeColor }
          : {
              background: "transparent",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }),
      }}
    >
      {label}
      {closeable && <span className="ml-0.5 text-[10px] opacity-70">✕</span>}
    </button>
  );
}

// ── ExplorerSessionCard ───────────────────────────────────────────────────────

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
