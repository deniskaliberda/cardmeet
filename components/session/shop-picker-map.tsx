"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type ShopMapOption = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  lat: number;
  lng: number;
};

export function ShopPickerMap({
  shops,
  selectedShopId,
  onSelect,
}: {
  shops: ShopMapOption[];
  selectedShopId: string | null;
  onSelect: (shop: ShopMapOption) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ shop: ShopMapOption; el: HTMLElement; popup: maplibregl.Popup }[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Sync selected marker styling
  useEffect(() => {
    for (const { shop, el } of markersRef.current) {
      const isSelected = shop.id === selectedShopId;
      el.style.background = isSelected ? "var(--primary)" : "#fff";
      el.style.color = isSelected ? "#fff" : "var(--primary)";
      el.style.boxShadow = isSelected
        ? "0 0 0 3px var(--primary), 0 2px 8px rgba(0,0,0,0.25)"
        : "0 1px 6px rgba(0,0,0,0.18)";
      el.style.transform = isSelected ? "scale(1.2)" : "scale(1)";
    }
  }, [selectedShopId]);

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
        layers: [{ id: "osm-tiles", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }],
      },
      center: [13.405, 52.52],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      const validShops = shops.filter((s) => s.lat && s.lng);

      for (const shop of validShops) {
        // Custom marker element
        const el = document.createElement("div");
        el.style.cssText = `
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #fff;
          color: var(--primary);
          border: 2px solid var(--primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 6px rgba(0,0,0,0.18);
          user-select: none;
        `;
        el.innerHTML = "🏪";

        // Popup on hover
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 20,
          maxWidth: "200px",
        });

        popup.setHTML(`
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:10px 12px;">
            <div style="font-size:13px; font-weight:600; color:#0f172a; margin-bottom:3px; line-height:1.3;">${shop.name}</div>
            <div style="font-size:11px; color:#64748b;">${shop.address}</div>
            ${shop.district ? `<div style="font-size:11px; color:#64748b;">${shop.district}</div>` : ""}
          </div>
        `);

        el.addEventListener("mouseenter", () => popup.addTo(map).setLngLat([shop.lng, shop.lat]));
        el.addEventListener("mouseleave", () => popup.remove());
        el.addEventListener("click", () => {
          popup.remove();
          onSelectRef.current(shop);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([shop.lng, shop.lat])
          .addTo(map);

        markersRef.current.push({ shop, el, popup });
      }

      // Fit map to show all shops
      if (validShops.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const s of validShops) bounds.extend([s.lng, s.lat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
      } else if (validShops.length === 1) {
        map.setCenter([validShops[0].lng, validShops[0].lat]);
        map.setZoom(13);
      }
    });

    mapRef.current = map;

    return () => {
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-border"
      style={{ height: "220px" }}
    />
  );
}
