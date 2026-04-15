"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Users, Crown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LocationBar } from "./location-bar";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { getTCG } from "@/lib/config/tcg";
import { cn } from "@/lib/utils";
import type { MapSession } from "@/components/map/session-map";

const STORAGE_KEY = "cardmeet_location";

type LocationState = {
  city: string;
  lat: number;
  lng: number;
  radius: number;
};

type MySession = MapSession & { isHost?: boolean };

function mapSession(s: Record<string, unknown>): MapSession {
  return {
    id: s.id as string,
    title: s.title as string,
    tcg: s.tcg as string,
    format: s.format as string,
    max_players: s.max_players as number,
    current_players: s.current_players as number,
    status: s.status as string,
    city: (s.city as string) ?? null,
    location_name: (s.location_name as string) ?? null,
    postal_code: (s.postal_code as string) ?? null,
    lat: s.lat as number,
    lng: s.lng as number,
    scheduled_at: s.scheduled_at as string,
    host_username: (s.host_username as string) ?? null,
    host_avatar: (s.host_avatar as string) ?? null,
    shop_id: (s.shop_id as string) ?? null,
    shop_name: (s.shop_name as string) ?? null,
  };
}

const TABS = [
  { id: "open", label: "Offene Sessions" },
  { id: "mine", label: "Meine Sessions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SessionsPageClient({
  initialSessions,
  mySessions = [],
  isLoggedIn = false,
  serverLat,
  serverLng,
  serverCity,
}: {
  initialSessions: MapSession[];
  mySessions?: MySession[];
  isLoggedIn?: boolean;
  serverLat: number;
  serverLng: number;
  serverCity: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("open");
  const [location, setLocation] = useState<LocationState>({
    city: serverCity,
    lat: serverLat,
    lng: serverLng,
    radius: 25,
  });
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: LocationState = JSON.parse(saved);
        setLocation(parsed);
      } catch {
        // ignore
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    fetchSessions(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, location.radius, initialized]);

  async function fetchSessions(loc: LocationState) {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("nearby_sessions", {
      p_lat: loc.lat,
      p_lng: loc.lng,
      radius_km: loc.radius,
    });
    setSessions((data ?? []).map(mapSession));
    setLoading(false);
  }

  function handleLocationChange(city: string, lat: number, lng: number) {
    const newLoc: LocationState = { ...location, city, lat, lng };
    setLocation(newLoc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoc));
  }

  function handleRadiusChange(radius: number) {
    const newLoc: LocationState = { ...location, radius };
    setLocation(newLoc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoc));
  }

  return (
    <div className="space-y-4">
      {/* Header + Tab Switcher */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.02em]">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTab === "open"
              ? `${location.city} · ${location.radius} km Umkreis`
              : `${mySessions.length} anstehende Session${mySessions.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isLoggedIn && (
          <div className="flex gap-0 rounded-[10px] bg-card p-[3px] shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Open Sessions Tab */}
      {activeTab === "open" && (
        <LandingExplorer
          sessions={sessions}
          center={{ lat: location.lat, lng: location.lng }}
          radius={location.radius}
          locationBar={
            <LocationBar
              city={location.city}
              radius={location.radius}
              onLocationChange={handleLocationChange}
              onRadiusChange={handleRadiusChange}
              loading={loading}
            />
          }
        />
      )}

      {/* Meine Sessions Tab */}
      {activeTab === "mine" && (
        <div className="space-y-4">
          {mySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="text-5xl mb-4">🎴</div>
              <p className="font-heading font-semibold text-lg mb-1">Noch keine Sessions</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                Erstelle deine erste Session oder suche Mitspieler über LFG.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/sessions/create"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Session erstellen
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-card"
                >
                  LFG starten
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {mySessions.map((session) => (
                <MySessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MySessionCard({ session }: { session: MySession }) {
  const tcg = getTCG(session.tcg);
  const scheduledDate = new Date(session.scheduled_at);
  const isToday = new Date().toDateString() === scheduledDate.toDateString();
  const slotsLeft = session.max_players - session.current_players;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
    >
      {/* TCG accent bar */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: tcg?.color ?? "var(--primary)" }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${tcg?.color ?? "#666"}20`,
              color: tcg?.color,
              border: `1px solid ${tcg?.color ?? "#666"}40`,
            }}
          >
            <TCGIcon tcgId={session.tcg} className="h-3 w-3" color={tcg?.color} />
            {tcg?.shortName}: {session.format}
          </span>
          {session.isHost && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs font-semibold">
              <Crown className="h-3 w-3" />
              HOST
            </span>
          )}
          {isToday && (
            <span className="rounded-full bg-green-500/20 text-green-400 px-2 py-0.5 text-xs font-semibold animate-pulse">
              Heute
            </span>
          )}
        </div>

        <p className="text-sm font-semibold truncate">{session.title}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de })} Uhr
          </span>
          {(session.location_name || session.city) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {session.location_name ?? session.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {slotsLeft > 0 ? `${slotsLeft} Plätze frei` : "Voll"}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
