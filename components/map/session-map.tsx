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
  postal_code: string | null;
  lat: number;
  lng: number;
  scheduled_at: string;
  host_username: string | null;
  host_avatar: string | null;
};

const TCG_COLORS: Record<string, string> = {
  magic: "#9B4DCA",
  pokemon: "#FFCC00",
  yugioh: "#1A3A6E",
  lorcana: "#1E3A8A",
  onepiece: "#DC2626",
  "flesh-and-blood": "#B45309",
  "weiss-schwarz": "#0EA5E9",
};

function getTcgColor(tcgId: string): string {
  return TCG_COLORS[tcgId] ?? "#6366f1";
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
          color: getTcgColor(s.tcg),
        },
      })),
  };
}

function boundsFromRadius(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return new maplibregl.LngLatBounds(
    [lng - lngDelta, lat - latDelta],
    [lng + lngDelta, lat + latDelta]
  );
}

export function SessionMap({
  sessions,
  center,
  radius,
}: {
  sessions: MapSession[];
  center?: { lat: number; lng: number };
  radius?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  // Refs so map event handlers always see fresh values without re-registering
  const sessionsRef = useRef(sessions);
  const selectedIdRef = useRef<string | null>(null);

  const selectedSessionId = useExplorerStore((s) => s.selectedSessionId);
  const hoveredSessionId = useExplorerStore((s) => s.hoveredSessionId);
  const setSelected = useExplorerStore((s) => s.setSelected);

  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { selectedIdRef.current = selectedSessionId; }, [selectedSessionId]);

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
      center: [13.405, 52.52],
      zoom: 9,
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

      // Layer 1: outer glow
      map.addLayer({
        id: "session-glow",
        type: "circle",
        source: "sessions",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 26,
            ["boolean", ["feature-state", "hovered"], false], 22,
            16,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0.22,
            ["boolean", ["feature-state", "hovered"], false], 0.18,
            0.0,
          ],
          "circle-blur": 0.6,
        },
      });

      // Layer 2: main circle
      map.addLayer({
        id: "session-circles",
        type: "circle",
        source: "sessions",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 13,
            ["boolean", ["feature-state", "hovered"], false], 11,
            8,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 1,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 3,
            ["boolean", ["feature-state", "hovered"], false], 2.5,
            2,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-pitch-alignment": "map",
        },
      });

      // Layer 3: white inner dot
      map.addLayer({
        id: "session-inner",
        type: "circle",
        source: "sessions",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 4.5,
            ["boolean", ["feature-state", "hovered"], false], 3.5,
            2.5,
          ],
          "circle-color": "#ffffff",
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 1,
            ["boolean", ["feature-state", "hovered"], false], 1,
            0.85,
          ],
          "circle-pitch-alignment": "map",
        },
      });

      // Click handler
      map.on("click", "session-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const id = feature.properties.id as string;
        setSelected(id);
      });

      // Hover cursor + hover popup
      map.on("mouseenter", "session-circles", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const sessionId = feature.properties.id as string;
        // Don't show hover popup if this session is already selected
        if (selectedIdRef.current === sessionId) return;
        if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
        showHoverPopup(sessionId, e.lngLat);
      });
      map.on("mouseleave", "session-circles", () => {
        map.getCanvas().style.cursor = "";
        scheduleHoverClose();
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

  // Fit map to center + radius when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const bounds = boundsFromRadius(center.lat, center.lng, radius ?? 25);
    const apply = () => map.fitBounds(bounds, { padding: 40, duration: 800, maxZoom: 14 });
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [center?.lat, center?.lng, radius]);

  // Highlight hovered session from list
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Clear previous hover state (only that feature, not selected state)
    if (hoveredIndexRef.current !== null) {
      map.setFeatureState(
        { source: "sessions", id: hoveredIndexRef.current },
        { hovered: false }
      );
      hoveredIndexRef.current = null;
    }

    if (hoveredSessionId) {
      const geojson = sessionsToGeoJSON(sessions);
      const featureIndex = geojson.features.findIndex(
        (f) => f.properties?.id === hoveredSessionId
      );
      if (featureIndex >= 0) {
        map.setFeatureState(
          { source: "sessions", id: featureIndex },
          { hovered: true }
        );
        hoveredIndexRef.current = featureIndex;
      }
    }
  }, [hoveredSessionId, sessions]);

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

  function scheduleHoverClose() {
    hoverCloseTimerRef.current = setTimeout(() => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    }, 180);
  }

  function showHoverPopup(sessionId: string, lngLat: maplibregl.LngLat) {
    const map = mapRef.current;
    if (!map) return;
    hoverPopupRef.current?.remove();

    const session = sessionsRef.current.find((s) => s.id === sessionId);
    if (!session?.lat || !session?.lng) return;

    const tcg = getTCG(session.tcg);
    const color = getTcgColor(session.tcg);
    const dateStr = format(new Date(session.scheduled_at), "EEE, d. MMM · HH:mm", { locale: de });
    const free = session.max_players - session.current_players;
    const isFull = free <= 0;

    const html = `
      <a href="/sessions/${session.id}" style="
        display: block;
        text-decoration: none;
        color: inherit;
        font-family: system-ui, -apple-system, sans-serif;
        min-width: 200px;
        font-size: 13px;
        line-height: 1.45;
        cursor: pointer;
      ">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:7px;">
          <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
          <span style="font-size:11px; color:${color}; font-weight:700; letter-spacing:0.02em;">${tcg?.shortName ?? session.tcg} · ${session.format}</span>
        </div>
        <div style="font-weight:650; font-size:14px; margin-bottom:5px; color:#111;">${session.title}</div>
        <div style="color:#6b7280; font-size:12px; margin-bottom:2px;">${dateStr} Uhr</div>
        ${session.location_name || session.city ? `<div style="color:#6b7280; font-size:12px; margin-bottom:2px;">📍 ${session.location_name ?? session.city}</div>` : ""}
        <div style="
          display:inline-flex; align-items:center; gap:5px;
          margin-top:8px; padding:3px 10px; border-radius:20px;
          font-size:11px; font-weight:600;
          background:${isFull ? "rgba(229,62,62,0.1)" : `${color}15`};
          color:${isFull ? "#dc2626" : color};
          border: 1px solid ${isFull ? "rgba(229,62,62,0.25)" : `${color}30`};
        ">
          👥 ${isFull ? "Voll" : `${free} von ${session.max_players} frei`}
        </div>
        <div style="margin-top:8px; font-size:11px; color:${color}; font-weight:600; opacity:0.8;">Klicken für Details →</div>
      </a>
    `;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 16,
      maxWidth: "250px",
    })
      .setLngLat([session.lng, session.lat])
      .setHTML(html)
      .addTo(map);

    // Keep popup open while hovering over it
    const el = popup.getElement();
    el.addEventListener("mouseenter", () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    });
    el.addEventListener("mouseleave", () => scheduleHoverClose());

    hoverPopupRef.current = popup;
  }

  function showPopup(sessionId: string) {
    const map = mapRef.current;
    if (!map) return;

    // Close hover popup before showing the full selected popup
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverPopupRef.current?.remove();
    hoverPopupRef.current = null;

    popupRef.current?.remove();

    const session = sessions.find((s) => s.id === sessionId);
    if (!session?.lat || !session?.lng) return;

    const tcg = getTCG(session.tcg);
    const color = getTcgColor(session.tcg);
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
    <div ref={containerRef} className="h-full w-full" />
  );
}
