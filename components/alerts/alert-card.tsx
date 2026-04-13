"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pause, Play, Trash2 } from "lucide-react";
import { toggleAlert, deleteAlert } from "@/app/(app)/alerts/actions";
import { getTCG } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  tcg: string;
  format: string | null;
  max_radius_km: number;
  days_of_week: number[];
  status: "active" | "paused";
  lat?: number | null;
  lng?: number | null;
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function AlertCard({ alert }: { alert: Alert }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const tcg = getTCG(alert.tcg);
  const isActive = alert.status === "active";
  const dayStr =
    alert.days_of_week.length > 0
      ? alert.days_of_week.map((d) => DAY_LABELS[d]).join(", ")
      : "Jeden Tag";

  useEffect(() => {
    if (alert.lat == null || alert.lng == null) return;
    const lat = alert.lat;
    const lng = alert.lng;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "de" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const label =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          data.display_name?.split(",")[0] ||
          `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        setLocationLabel(label);
      })
      .catch(() => {
        setLocationLabel(`${lat.toFixed(2)}, ${lng.toFixed(2)}`);
      });
  }, [alert.lat, alert.lng]);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAlert(alert.id);
      if (result && "error" in result) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAlert(alert.id);
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Alert geloescht");
        router.refresh();
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        isActive
          ? "bg-[var(--surface-container-low)] border-2 border-primary"
          : "bg-[var(--surface-container-low)] border-2 border-[var(--outline-variant)] opacity-60"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: tcg?.color ? `${tcg.color}15` : undefined,
              color: tcg?.color,
            }}
          >
            <TCGIcon tcgId={alert.tcg} className="h-3 w-3" color={tcg?.color} />
            {tcg?.shortName}: {alert.format ?? "Alle"}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#006b5c] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#006b5c] animate-pulse" />
              Aktiv
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleToggle}
            disabled={pending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
            title={isActive ? "Pausieren" : "Aktivieren"}
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Loeschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>{dayStr} · {alert.max_radius_km} km Umkreis</div>
        {(alert.lat != null) && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{locationLabel ?? "Standort wird geladen..."}</span>
          </div>
        )}
        {alert.lat == null && (
          <div className="flex items-center gap-1 mt-1 text-amber-500/80">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>Kein Standort gesetzt</span>
          </div>
        )}
      </div>
    </div>
  );
}
