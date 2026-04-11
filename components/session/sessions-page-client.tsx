"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LocationBar } from "./location-bar";
import { LandingExplorer } from "@/components/landing/landing-explorer";
import type { MapSession } from "@/components/map/session-map";

const STORAGE_KEY = "cardmeet_location";

type LocationState = {
  city: string;
  lat: number;
  lng: number;
  radius: number;
};

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
  };
}

export function SessionsPageClient({
  initialSessions,
  serverLat,
  serverLng,
  serverCity,
}: {
  initialSessions: MapSession[];
  serverLat: number;
  serverLng: number;
  serverCity: string;
}) {
  const [location, setLocation] = useState<LocationState>({
    city: serverCity,
    lat: serverLat,
    lng: serverLng,
    radius: 25,
  });
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load saved location from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: LocationState = JSON.parse(saved);
        setLocation(parsed);
      } catch {
        // ignore malformed data
      }
    }
    setInitialized(true);
  }, []);

  // Re-fetch whenever location or radius changes (after init)
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
      <div>
        <h1 className="text-2xl font-semibold">Sessions in deiner Nähe</h1>
        <p className="text-sm text-muted-foreground">
          {location.city} · {location.radius} km Umkreis
        </p>
      </div>
      <LocationBar
        city={location.city}
        radius={location.radius}
        onLocationChange={handleLocationChange}
        onRadiusChange={handleRadiusChange}
        loading={loading}
      />
      <LandingExplorer sessions={sessions} />
    </div>
  );
}
