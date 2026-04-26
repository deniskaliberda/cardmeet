"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users, Search, Star, Clock, Zap, Target } from "lucide-react";
import { TCG_LIST, getTCG, getPowerLevel } from "@/lib/config/tcg";
import { TCGIcon, TCGImage } from "@/components/icons/tcg-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { JoinButton } from "@/components/session/join-button";
import { ActiveAlertsBar } from "@/components/alerts/active-alerts-bar";
import { cn } from "@/lib/utils";
import type { MapSession } from "@/components/map/session-map";

const SessionMap = dynamic(
  () => import("@/components/map/session-map").then((m) => m.SessionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--surface-container-low)] text-sm text-muted-foreground rounded-2xl">
        Karte wird geladen...
      </div>
    ),
  }
);

const DATE_PRESETS = [
  { id: undefined, label: "Heute" },
  { id: "tomorrow", label: "Morgen" },
  { id: "week", label: "Diese Woche" },
] as const;

type Session = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  power_level?: number | null;
  max_players: number;
  current_players: number;
  status: string;
  city: string | null;
  location_name: string | null;
  scheduled_at: string;
  host_id?: string;
  profiles?: { username: string; avatar_url: string | null; avg_rating?: number | null } | null;
};

type NextSession = {
  id: string;
  title: string;
  tcg: string;
  scheduled_at: string;
};

export function SessionsBrowser({
  sessions,
  mapSessions,
  currentUserId,
  joinedSessionIds,
  activeTcg,
  activeFormat,
  activeDate,
  alerts = [],
  nextSessions = [],
}: {
  sessions: Session[];
  mapSessions: MapSession[];
  currentUserId: string;
  joinedSessionIds: string[];
  activeTcg?: string;
  activeFormat?: string;
  activeDate?: string;
  alerts?: any[];
  nextSessions?: NextSession[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
      if (key === "tcg") params.delete("format");
    } else {
      params.set(key, value);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome + Stats Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.02em]">
            Sessions in deiner Naehe
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sessions.length} offene {sessions.length === 1 ? "Session" : "Sessions"} verfuegbar
          </p>
        </div>
        <Link
          href="/sessions/create"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white tonal-transition hover:bg-primary/90 shrink-0"
        >
          + Session erstellen
        </Link>
      </div>

      {/* TCG Quick Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter("tcg", null)}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
            !activeTcg
              ? "bg-primary text-white"
              : "bg-[var(--surface-container-low)] text-muted-foreground hover:text-primary hover:bg-primary/15"
          )}
        >
          Alle
        </button>
        {TCG_LIST.map((tcg) => {
          const isActive = activeTcg === tcg.id;
          return (
            <button
              key={tcg.id}
              onClick={() => setFilter("tcg", isActive ? null : tcg.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                isActive
                  ? "bg-primary text-white"
                  : "bg-[var(--surface-container-low)] text-muted-foreground hover:text-primary hover:bg-primary/15"
              )}
            >
              <TCGIcon tcgId={tcg.id} className="h-3 w-3" color={isActive ? "white" : "currentColor"} />
              {tcg.shortName}
            </button>
          );
        })}
      </div>

      {/* Quick Info: Next upcoming sessions the user joined */}
      {nextSessions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {nextSessions.map((s) => {
            const tcg = getTCG(s.tcg);
            const date = new Date(s.scheduled_at);
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] tonal-transition hover:shadow-[0_4px_16px_oklch(0.224_0.018_275.1/12%)] flex-1 min-w-[240px]"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-black/30">
                  <TCGImage tcgId={s.tcg} size={40} className="rounded-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isToday ? "Heute" : format(date, "EEE d. MMM", { locale: de })},{" "}
                    {format(date, "HH:mm")} Uhr
                  </div>
                </div>
                {isToday && (
                  <span className="shrink-0 rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-xs font-semibold animate-pulse">
                    Heute
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="rounded-[14px] bg-card p-4 shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)]">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Suche nach Spielen, Orten oder Spielern..."
              className="w-full rounded-[10px] bg-[var(--surface-container-low)] py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-card tonal-transition"
            />
          </div>

          <button
            onClick={() => {/* TODO: dropdown */}}
            className={cn(
              "rounded-[10px] px-5 py-2.5 text-sm font-medium tonal-transition cursor-pointer",
              activeTcg
                ? "bg-primary text-white"
                : "bg-[var(--surface-container-low)] text-foreground hover:bg-primary hover:text-white"
            )}
          >
            {activeTcg ? getTCG(activeTcg)?.shortName ?? activeTcg : "TCG waehlen"}
          </button>

          <button className="rounded-[10px] bg-[var(--surface-container-low)] px-5 py-2.5 text-sm font-medium text-foreground tonal-transition hover:bg-primary hover:text-white cursor-pointer">
            Umkreis: 10km
          </button>

          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setFilter("date", preset.id ?? null)}
              className={cn(
                "rounded-[10px] px-5 py-2.5 text-sm font-medium tonal-transition cursor-pointer",
                activeDate === preset.id
                  ? "bg-primary text-white"
                  : "bg-[var(--surface-container-low)] text-foreground hover:bg-primary hover:text-white"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Active Alerts Bar */}
        <ActiveAlertsBar alerts={alerts} />
      </div>

      {/* Split View: Session List + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6 h-[calc(100vh-320px)] min-h-[500px]">
        {/* Left: Session list */}
        <div ref={listRef} className="overflow-y-auto pr-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="text-4xl mb-4">🎴</div>
              <p className="font-heading font-medium text-lg mb-1">Keine Sessions gefunden</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-[280px]">
                Sei der Erste! Erstelle eine Session und finde Mitspieler in deiner Naehe.
              </p>
              <Link
                href="/sessions/create"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white tonal-transition hover:bg-primary/90"
              >
                Session erstellen
              </Link>
              <div className="mt-8 w-full space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Beliebte Spiele</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {TCG_LIST.slice(0, 5).map((tcg) => (
                    <button
                      key={tcg.id}
                      onClick={() => setFilter("tcg", tcg.id)}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--surface-container-low)] px-3 py-1.5 text-xs text-muted-foreground tonal-transition hover:text-primary hover:bg-primary/15 cursor-pointer"
                    >
                      <TCGIcon tcgId={tcg.id} className="h-3 w-3" color="currentColor" />
                      {tcg.shortName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sessions.map((session) => (
                <BrowserSessionCard
                  key={session.id}
                  session={session}
                  currentUserId={currentUserId}
                  isParticipant={joinedSessionIds.includes(session.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Map */}
        <div className="rounded-2xl overflow-hidden bg-card shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)]">
          <div className="flex items-center justify-between px-5 py-4 bg-card">
            <div className="font-medium text-sm">
              Karte: {sessions.length} Sessions in deiner Naehe
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-[var(--surface-container-low)] px-3.5 py-1.5 text-xs font-medium tonal-transition hover:bg-primary/15 hover:text-primary cursor-pointer">
                Mein Standort
              </button>
              <button className="rounded-lg bg-[var(--surface-container-low)] px-3.5 py-1.5 text-xs font-medium tonal-transition hover:bg-primary/15 hover:text-primary cursor-pointer">
                Zoom
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-60px)]">
            <SessionMap sessions={mapSessions} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserSessionCard({
  session,
  currentUserId,
  isParticipant,
}: {
  session: Session;
  currentUserId: string;
  isParticipant: boolean;
}) {
  const tcg = getTCG(session.tcg);
  const scheduledDate = new Date(session.scheduled_at);
  const isHost = session.host_id === currentUserId;
  const isFull = session.status === "full";
  const slotsLeft = session.max_players - session.current_players;
  const slotVariant = isFull ? "full" : slotsLeft <= 1 ? "warning" : "open";
  const powerLevel =
    session.power_level != null
      ? getPowerLevel(session.tcg, session.format, session.power_level)
      : undefined;

  const accent = tcg?.color ?? "var(--primary)";

  return (
    <Link href={`/sessions/${session.id}`}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl p-3.5 cursor-pointer shadow-[0_1px_4px_oklch(0.224_0.018_275.1/5%)] tonal-transition",
          "hover:translate-x-[3px] hover:shadow-[0_4px_16px_oklch(0.475_0.202_260.8/8%)]"
        )}
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 6%, var(--card)) 0%, var(--card) 60%)`,
        }}
      >
        {/* TCG accent bar — design system: 4px left border in TCG color */}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
          style={{ backgroundColor: accent, opacity: 0.85 }}
        />
        {/* Header: title + badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-sm font-medium">{session.title}</div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium mt-1"
              style={{
                backgroundColor: tcg?.color ? `${tcg.color}20` : undefined,
                color: tcg?.color,
                border: tcg?.color ? `1px solid ${tcg.color}40` : undefined,
              }}
            >
              <TCGIcon tcgId={session.tcg} className="h-3 w-3" color={tcg?.color} />
              {tcg?.shortName}: {session.format}
            </span>
          </div>
          {powerLevel && (
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: powerLevel.color }}
              title={`${powerLevel.name}: ${powerLevel.description}`}
            >
              {powerLevel.level}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })} Uhr</span>
          </div>
          {(session.location_name || session.city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>{session.location_name ?? session.city} (~500m Radius)</span>
            </div>
          )}
          {powerLevel && (
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              <span>Power Level: {powerLevel.level}/10</span>
            </div>
          )}
        </div>

        {/* Footer: slots + host + join */}
        <div className="flex items-center justify-between pt-2.5">
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              color:
                slotVariant === "open"
                  ? "var(--slot-free)"
                  : slotVariant === "warning"
                  ? "var(--slot-almost)"
                  : "var(--slot-full)",
              background:
                slotVariant === "open"
                  ? "color-mix(in oklch, var(--slot-free) 12%, transparent)"
                  : slotVariant === "warning"
                  ? "color-mix(in oklch, var(--slot-almost) 12%, transparent)"
                  : "color-mix(in oklch, var(--slot-full) 12%, transparent)",
            }}
          >
            <Users className="h-3 w-3" />
            <span>
              {isFull
                ? "Session voll"
                : `${slotsLeft} von ${session.max_players} Plaetzen frei`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {(session.profiles?.username ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight">
                  {session.profiles?.username ?? "Unbekannt"}
                </span>
                {session.profiles?.avg_rating != null && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    {session.profiles.avg_rating}
                  </span>
                )}
              </div>
            </div>

            <JoinButton
              sessionId={session.id}
              isHost={isHost}
              isParticipant={isParticipant}
              isFull={isFull}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
