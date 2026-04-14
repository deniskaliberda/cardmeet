"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, CalendarDays, Clock, MapPin, Search, Store, Users, X } from "lucide-react";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    case "today": return { from: today, to: addDays(today, 1) };
    case "tomorrow": { const t = addDays(today, 1); return { from: t, to: addDays(t, 1) }; }
    case "weekend": { const dow = today.getDay(); const s = addDays(today, dow === 6 ? 0 : (6 - dow + 7) % 7 || 7); return { from: s, to: addDays(s, 2) }; }
    case "week": return { from: today, to: addDays(today, 7) };
    default: { const [y, m, d] = filter.split("-").map(Number); const s = new Date(y, m - 1, d); return { from: s, to: addDays(s, 1) }; }
  }
}
function minutesToLabel(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

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
    activeTcg, activeFormat, activePowerLevel,
    searchQuery,
    dateFilter, fromMinutes,
    shopOnly,
    setSelected, setHovered,
    setTcgFilter, setFormatFilter, setPowerLevelFilter,
    setSearchQuery,
    setDateFilter, setFromMinutes,
    toggleShopOnly,
  } = useExplorerStore();

  const listRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // TCG config for active selection
  const activeTcgConfig = activeTcg ? getTCG(activeTcg) : null;
  const activeFormatConfig = activeTcgConfig?.formats.find((f) => f.id === activeFormat);
  const powerLevels = activeFormatConfig?.powerLevels ?? [];

  // Filtering
  const filtered = sessions.filter((s) => {
    if (shopOnly && !(s as any).shop_id) return false;
    if (activeTcg && s.tcg !== activeTcg) return false;
    if (activeFormat && s.format !== activeFormat) return false;
    if (activePowerLevel != null && (s as any).power_level !== activePowerLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = s.title?.toLowerCase() ?? "";
      const city = s.city?.toLowerCase() ?? "";
      const loc = s.location_name?.toLowerCase() ?? "";
      if (!title.includes(q) && !city.includes(q) && !loc.includes(q)) return false;
    }
    const range = getDateRange(dateFilter);
    if (range) {
      const d = new Date(s.scheduled_at);
      if (d < range.from || d >= range.to) return false;
    }
    if (fromMinutes !== null) {
      const d = new Date(s.scheduled_at);
      if (d.getHours() * 60 + d.getMinutes() < fromMinutes) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!selectedSessionId || !listRef.current) return;
    listRef.current.querySelector(`[data-session-id="${selectedSessionId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSessionId]);

  const isSpecificDate = dateFilter !== "all" && !["today","tomorrow","weekend","week"].includes(dateFilter);
  const specificDateLabel = isSpecificDate ? (() => {
    const [y, m, d] = dateFilter.split("-").map(Number);
    return format(new Date(y, m - 1, d), "d. MMM", { locale: de });
  })() : null;

  return (
    <div className="grid grid-cols-[3fr_7fr] gap-5" style={{ height: "600px" }}>

      {/* ── Left panel ────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col gap-2.5">

        {/* Location bar */}
        {locationBar}

        {/* Search */}
        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-3 py-2" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Session suchen..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date filter */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          {DATE_OPTIONS.map((opt) => (
            <FilterPill key={opt.id} label={opt.label} active={dateFilter === opt.id} onClick={() => setDateFilter(opt.id)} />
          ))}
          <div className="relative">
            <button type="button" title="Datum wählen" onClick={() => dateInputRef.current?.showPicker?.()}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 transition-all"
              style={specificDateLabel ? { background: "rgba(0,102,255,0.13)", borderColor: "var(--primary)", color: "var(--primary)" } : { background: "transparent", borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <CalendarDays className="h-3 w-3" />
            </button>
            <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none w-0 h-0"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => e.target.value && setDateFilter(e.target.value)} />
          </div>
          {specificDateLabel && <FilterPill label={specificDateLabel} active closeable onClick={() => setDateFilter("all")} />}
        </div>

        {/* From-time picker */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-medium">Ab</span>
          {fromMinutes !== null ? (
            <button type="button" onClick={() => setFromMinutes(null)}
              className="flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-semibold transition-all"
              style={{ background: "rgba(0,102,255,0.13)", borderColor: "var(--primary)", color: "var(--primary)" }}>
              {minutesToLabel(fromMinutes)} Uhr <X className="h-2.5 w-2.5 opacity-70" />
            </button>
          ) : (
            <button type="button" onClick={() => timeInputRef.current?.showPicker?.()}
              className="flex items-center gap-1 rounded-full border-2 border-dashed border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer">
              Uhrzeit wählen
            </button>
          )}
          <input ref={timeInputRef} type="time" className="absolute opacity-0 pointer-events-none w-0 h-0"
            onChange={(e) => { if (e.target.value) { const [h, m] = e.target.value.split(":").map(Number); setFromMinutes(h * 60 + m); } }} />
        </div>

        {/* TCG filter + shop filter */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          <FilterPill label="Alle" active={!activeTcg} onClick={() => setTcgFilter(null)} />
          {TCG_LIST.map((tcg) => (
            <FilterPill key={tcg.id} label={tcg.shortName} active={activeTcg === tcg.id} color={tcg.color}
              onClick={() => setTcgFilter(activeTcg === tcg.id ? null : tcg.id)} />
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" />
          <FilterPill label="🏪 Im Laden" active={shopOnly} color="#D97706"
            onClick={toggleShopOnly} />
        </div>

        {/* Format filter (shown when TCG selected) */}
        {activeTcgConfig && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
            <FilterPill label="Alle Formate" active={!activeFormat} onClick={() => setFormatFilter(null)} small />
            {activeTcgConfig.formats.map((f) => (
              <FilterPill key={f.id} label={f.name} active={activeFormat === f.id} color={activeTcgConfig.color}
                onClick={() => setFormatFilter(activeFormat === f.id ? null : f.id)} small />
            ))}
          </div>
        )}

        {/* Power level filter (shown when format has levels) */}
        {powerLevels.length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
            <FilterPill label="Alle Level" active={activePowerLevel === null} onClick={() => setPowerLevelFilter(null)} small />
            {powerLevels.map((pl) => (
              <FilterPill key={pl.level} label={`${pl.level} · ${pl.name}`} active={activePowerLevel === pl.level}
                color={pl.color} onClick={() => setPowerLevelFilter(activePowerLevel === pl.level ? null : pl.level)} small />
            ))}
          </div>
        )}

        {/* Count */}
        <div className="flex-shrink-0 text-xs text-muted-foreground">
          {filtered.length} Session{filtered.length !== 1 ? "s" : ""} gefunden
        </div>

        {/* List */}
        <div ref={listRef} className="sessions-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="font-medium">Keine Sessions gefunden</p>
              <p className="mt-1 text-sm text-muted-foreground">Andere Filter versuchen oder Session erstellen!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((session) => (
                <ExplorerSessionCard key={session.id} session={session}
                  isSelected={selectedSessionId === session.id}
                  onSelect={() => setSelected(selectedSessionId === session.id ? null : session.id)}
                  onHoverStart={() => setHovered(session.id)}
                  onHoverEnd={() => setHovered(null)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Map ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border-2 border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <SessionMap sessions={filtered} center={center} radius={radius} />
      </div>
    </div>
  );
}

// ── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({ label, active, color, onClick, small, closeable }: {
  label: string; active: boolean; color?: string; onClick: () => void; small?: boolean; closeable?: boolean;
}) {
  const ac = color ?? "#0066FF";
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 rounded-full border-2 font-semibold transition-all cursor-pointer"
      style={{ fontSize: small ? "10px" : "11px", padding: small ? "2px 10px" : "3px 12px",
        ...(active ? { background: `${ac}22`, borderColor: ac, color: ac } : { background: "transparent", borderColor: "var(--border)", color: "var(--muted-foreground)" }) }}>
      {label}{closeable && <span className="ml-0.5 text-[10px] opacity-70">✕</span>}
    </button>
  );
}

// ── ExplorerSessionCard ───────────────────────────────────────────────────────

function ExplorerSessionCard({ session, isSelected, onSelect, onHoverStart, onHoverEnd }: {
  session: MapSession; isSelected: boolean; onSelect: () => void; onHoverStart: () => void; onHoverEnd: () => void;
}) {
  const tcg = getTCG(session.tcg);
  const scheduledDate = new Date(session.scheduled_at);
  const free = session.max_players - session.current_players;
  const isFull = free <= 0;
  const isAlmostFull = free === 1 && !isFull;
  const slotsStyle = isFull
    ? { bg: "rgba(229,62,62,0.08)", border: "rgba(229,62,62,0.25)", color: "#E53E3E" }
    : isAlmostFull ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#F59E0B" }
    : { bg: "rgba(0,168,120,0.08)", border: "rgba(0,168,120,0.25)", color: "#00A878" };

  return (
    <a href={`/sessions/${session.id}`} data-session-id={session.id}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 bg-card p-3.5 text-left transition-all duration-200 hover:translate-x-0.5 hover:border-primary hover:shadow-[0_4px_16px_rgba(0,102,255,0.08)] block"
      style={{ borderColor: isSelected ? "var(--primary)" : "var(--border)", background: isSelected ? "rgba(0,102,255,0.04)" : "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}>
      <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-primary transition-opacity duration-200 group-hover:opacity-100"
        style={{ opacity: isSelected ? 1 : 0 }} aria-hidden />
      <div className="mb-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="truncate text-sm font-medium flex-1">{session.title}</p>
          {((session as any).shop_id || (session as any).is_venue) && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
              🏪 {(session as any).shop_name || (session as any).venue_name || "LGS"}
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: tcg?.color ?? "#6B7280", fontFamily: "var(--font-mono), 'Fira Code', monospace", fontWeight: 300 }}>
          {tcg?.shortName ?? session.tcg}: {session.format}
        </p>
      </div>
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
      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
          style={{ background: slotsStyle.bg, borderColor: slotsStyle.border, color: slotsStyle.color }}>
          <Users className="h-3 w-3" />
          {isFull ? "Session voll" : `${free} von ${session.max_players} frei`}
        </div>
        <a href={`/players/${(session as any).host_id}`} onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            {(session.host_username ?? "??").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-medium">{session.host_username ?? "Unbekannt"}</span>
        </a>
      </div>
    </a>
  );
}
