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
        if (selectedIdRef.current === sessionId) return;
        if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
        showHoverPopup(sessionId);
      });
      map.on("mouseleave", "session-circles", () => {
        map.getCanvas().style.cursor = "";
        scheduleHoverClose();
      });

      // Inject popup styles into <head> so they apply globally
      if (!document.getElementById("cm-popup-styles")) {
        const style = document.createElement("style");
        style.id = "cm-popup-styles";
        style.textContent = `
          .cm-hover-popup .maplibregl-popup-content {
            padding: 0 !important;
            border-radius: 14px !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.06) !important;
            overflow: hidden !important;
            background: var(--card, #ffffff) !important;
          }
          .cm-hover-popup .maplibregl-popup-tip { display: none !important; }
          .cm-selected-popup .maplibregl-popup-content {
            padding: 0 !important;
            border-radius: 14px !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08) !important;
            overflow: hidden !important;
            background: var(--card, #ffffff) !important;
          }
          .cm-selected-popup .maplibregl-popup-tip {
            border-top-color: var(--card, #ffffff) !important;
          }
          .cm-selected-popup .maplibregl-popup-close-button {
            font-size: 18px !important;
            color: #6b7280 !important;
            padding: 6px 10px !important;
            line-height: 1 !important;
            top: 2px !important;
            right: 2px !important;
          }
          .cm-selected-popup .maplibregl-popup-close-button:hover {
            color: #111 !important;
            background: rgba(0,0,0,0.04) !important;
            border-radius: 8px !important;
          }
        `;
        document.head.appendChild(style);
      }

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

  // Highlight hovered session from list + show hover popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Clear previous hover state
    if (hoveredIndexRef.current !== null) {
      map.setFeatureState({ source: "sessions", id: hoveredIndexRef.current }, { hovered: false });
      hoveredIndexRef.current = null;
    }

    if (hoveredSessionId) {
      const geojson = sessionsToGeoJSON(sessions);
      const featureIndex = geojson.features.findIndex(
        (f) => f.properties?.id === hoveredSessionId
      );
      if (featureIndex >= 0) {
        map.setFeatureState({ source: "sessions", id: featureIndex }, { hovered: true });
        hoveredIndexRef.current = featureIndex;
      }
      // Show popup if not already selected
      if (selectedIdRef.current !== hoveredSessionId) {
        if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
        showHoverPopup(hoveredSessionId);
      }
    } else {
      scheduleHoverClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function showHoverPopup(sessionId: string) {
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
    const slotsColor = isFull ? "#dc2626" : color;
    const slotsBg = isFull ? "rgba(220,38,38,0.08)" : `${color}12`;
    const slotsBorder = isFull ? "rgba(220,38,38,0.2)" : `${color}28`;

    const html = `
      <a href="/sessions/${session.id}" style="
        display:block; text-decoration:none; color:inherit;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        width:220px; cursor:pointer;
      ">
        <div style="padding:14px 14px 0; border-bottom:1px solid rgba(0,0,0,0.06); padding-bottom:10px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${color}; display:inline-block; flex-shrink:0;"></span>
            <span style="font-size:10.5px; color:${color}; font-weight:700; letter-spacing:0.03em; text-transform:uppercase;">${tcg?.shortName ?? session.tcg} · ${session.format}</span>
          </div>
          <div style="font-size:14px; font-weight:600; color:#111; line-height:1.3; margin-bottom:0;">${session.title}</div>
        </div>
        <div style="padding:0 14px 14px; display:flex; flex-direction:column; gap:5px;">
          <div style="font-size:12px; color:#555;">🕐 ${dateStr} Uhr</div>
          ${session.location_name || session.city ? `<div style="font-size:12px; color:#555;">📍 ${session.location_name ?? session.city}</div>` : ""}
          <div style="display:inline-flex; align-items:center; gap:5px; margin-top:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:${slotsBg}; color:${slotsColor}; border:1px solid ${slotsBorder}; width:fit-content;">
            👥 ${isFull ? "Session voll" : `${free} von ${session.max_players} frei`}
          </div>
          <div style="margin-top:6px; font-size:11px; color:${color}; font-weight:600;">Details ansehen →</div>
        </div>
      </a>
    `;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 18,
      maxWidth: "none",
      className: "cm-hover-popup",
    })
      .setLngLat([session.lng, session.lat])
      .setHTML(html)
      .addTo(map);

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

    const free = session.max_players - session.current_players;
    const isFull = free <= 0;
    const slotsColor = isFull ? "#dc2626" : color;
    const slotsBg = isFull ? "rgba(220,38,38,0.08)" : `${color}12`;
    const slotsBorder = isFull ? "rgba(220,38,38,0.2)" : `${color}28`;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; width:230px;">
        <div style="padding:14px 32px 12px 14px; border-bottom:1px solid rgba(0,0,0,0.06);">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:7px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${color}; display:inline-block;"></span>
            <span style="font-size:10.5px; color:${color}; font-weight:700; letter-spacing:0.03em; text-transform:uppercase;">${tcg?.shortName ?? session.tcg} · ${session.format}</span>
          </div>
          <div style="font-size:14px; font-weight:600; color:#111; line-height:1.3;">${session.title}</div>
        </div>
        <div style="padding:12px 14px; display:flex; flex-direction:column; gap:5px;">
          <div style="font-size:12px; color:#555;">🕐 ${dateStr} Uhr</div>
          ${session.location_name || session.city ? `<div style="font-size:12px; color:#555;">📍 ${session.location_name || session.city}</div>` : ""}
          <div style="font-size:12px; color:#555;">👤 ${session.host_username ?? "Unbekannt"}</div>
          <div style="display:inline-flex; align-items:center; gap:5px; margin-top:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:${slotsBg}; color:${slotsColor}; border:1px solid ${slotsBorder}; width:fit-content;">
            👥 ${isFull ? "Session voll" : `${free} von ${session.max_players} frei`}
          </div>
          <a href="/sessions/${session.id}" style="margin-top:8px; display:inline-block; padding:7px 14px; border-radius:10px; background:${color}; color:#fff; font-size:12px; font-weight:600; text-decoration:none; text-align:center;">
            Session ansehen →
          </a>
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 16,
      maxWidth: "none",
      className: "cm-selected-popup",
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
