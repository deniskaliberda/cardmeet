"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useExplorerStore } from "@/lib/stores/explorer-store";
import { getTCG } from "@/lib/config/tcg";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export type MapSession = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  max_players: number;
  current_players: number;
  status: string;
  city: string | null;
  location_name: string | null;
  lat: number;
  lng: number;
  scheduled_at: string;
  host_username: string | null;
  host_avatar: string | null;
};

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

function sessionsToGeoJSON(sessions: MapSession[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sessions
      .filter((s) => s.lat && s.lng)
      .map((s, index) => ({
        type: "Feature" as const,
        id: index,
        geometry: {
          type: "Point" as const,
          coordinates: [s.lng, s.lat],
        },
        properties: {
          id: s.id,
          title: s.title,
          tcg: s.tcg,
          format: s.format,
          max_players: s.max_players,
          current_players: s.current_players,
          status: s.status,
          city: s.city ?? "",
          location_name: s.location_name ?? "",
          scheduled_at: s.scheduled_at,
          host_username: s.host_username ?? "Unbekannt",
          color: getMutedColor(s.tcg),
        },
      })),
  };
}

export function SessionMap({ sessions }: { sessions: MapSession[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const selectedSessionId = useExplorerStore((s) => s.selectedSessionId);
  const setSelected = useExplorerStore((s) => s.setSelected);

  const flyToSession = useCallback(
    (sessionId: string) => {
      const map = mapRef.current;
      if (!map) return;
      const session = sessions.find((s) => s.id === sessionId);
      if (!session?.lat || !session?.lng) return;
      map.flyTo({ center: [session.lng, session.lat], zoom: 11, duration: 800 });
    },
    [sessions]
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [10.45, 51.16],
      zoom: 5.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const geojson = sessionsToGeoJSON(sessions);

      map.addSource("sessions", {
        type: "geojson",
        data: geojson,
      });

      // Session circle layer
      map.addLayer({
        id: "session-circles",
        type: "circle",
        source: "sessions",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            12,
            ["boolean", ["feature-state", "hovered"], false],
            10,
            7,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.85,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            1.5,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#ffffff",
            "rgba(255,255,255,0.6)",
          ],
        },
      });

      // Click handler
      map.on("click", "session-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const id = feature.properties.id as string;
        setSelected(id);
      });

      // Hover cursor
      map.on("mouseenter", "session-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "session-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      // Fit bounds to sessions if there are any
      if (geojson.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const feature of geojson.features) {
          const coords = (feature.geometry as GeoJSON.Point).coordinates;
          bounds.extend(coords as [number, number]);
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON when sessions change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("sessions") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(sessionsToGeoJSON(sessions));
    }
  }, [sessions]);

  // React to selected session from list
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Clear previous selection state
    const source = map.getSource("sessions") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    // Remove old feature states
    map.removeFeatureState({ source: "sessions" });

    if (selectedSessionId) {
      // Find the feature index to set state
      const geojson = sessionsToGeoJSON(sessions);
      const featureIndex = geojson.features.findIndex(
        (f) => f.properties?.id === selectedSessionId
      );
      if (featureIndex >= 0) {
        map.setFeatureState(
          { source: "sessions", id: featureIndex },
          { selected: true }
        );
      }

      flyToSession(selectedSessionId);
      showPopup(selectedSessionId);
    } else {
      popupRef.current?.remove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, sessions]);

  function showPopup(sessionId: string) {
    const map = mapRef.current;
    if (!map) return;

    popupRef.current?.remove();

    const session = sessions.find((s) => s.id === sessionId);
    if (!session?.lat || !session?.lng) return;

    const tcg = getTCG(session.tcg);
    const color = getMutedColor(session.tcg);
    const scheduledDate = new Date(session.scheduled_at);
    const dateStr = format(scheduledDate, "EEE, d. MMM · HH:mm", { locale: de });

    const html = `
      <div style="font-family: system-ui, sans-serif; min-width: 180px; font-size: 13px; line-height: 1.4;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
          <span style="font-size: 11px; color: ${color}; font-weight: 600;">${tcg?.shortName ?? session.tcg}</span>
        </div>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${session.title}</div>
        <div style="color: #6b7280;">${dateStr} Uhr</div>
        <div style="color: #6b7280;">${session.location_name || session.city || ""}</div>
        <div style="color: #6b7280; margin-top: 2px;">${session.current_players}/${session.max_players} Spieler</div>
        <a href="/sessions/${session.id}" style="display: inline-block; margin-top: 8px; color: ${color}; font-weight: 500; text-decoration: none; font-size: 12px;">Details ansehen &rarr;</a>
      </div>
    `;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 14,
      maxWidth: "240px",
    })
      .setLngLat([session.lng, session.lat])
      .setHTML(html)
      .addTo(map);

    popup.on("close", () => {
      setSelected(null);
    });

    popupRef.current = popup;
  }

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg" />
  );
}
