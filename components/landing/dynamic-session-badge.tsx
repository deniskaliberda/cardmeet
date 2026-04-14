"use client";

import { useEffect, useState } from "react";

export function DynamicSessionBadge({ total }: { total: number }) {
  const [label, setLabel] = useState(`${total} aktive Session${total !== 1 ? "s" : ""} weltweit`);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase.rpc("nearby_sessions", {
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
            radius_km: 25,
          });
          const count = data?.length ?? 0;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "de" } }
          );
          const geo = await res.json();
          const city =
            geo.address?.city ||
            geo.address?.town ||
            geo.address?.village ||
            null;
          setLabel(
            count > 0
              ? `${count} aktive Session${count !== 1 ? "s" : ""}${city ? ` in ${city}` : " in deiner Nähe"}`
              : city
              ? `Noch keine Sessions in ${city} — starte die erste!`
              : `${total} aktive Session${total !== 1 ? "s" : ""} weltweit`
          );
        } catch {
          // silently keep default label
        }
      },
      () => {} // permission denied → keep default
    );
  }, [total]);

  return <>{label}</>;
}
