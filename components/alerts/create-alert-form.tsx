"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TCG_LIST } from "@/lib/config/tcg";
import { createAlert } from "@/app/(app)/alerts/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MapPin, Navigation, Search, X } from "lucide-react";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export function CreateAlertForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedTcg, setSelectedTcg] = useState(TCG_LIST[0].id);
  const [radius, setRadius] = useState(25);
  const [days, setDays] = useState<number[]>([5, 6]); // Sa, So default

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function handleGPS() {
    if (!navigator.geolocation) {
      toast.error("Geolocation wird nicht unterstützt");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setSearchResults([]);
        setLocationSearch("");
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "de" } }
          );
          const data = await res.json();
          const label =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.display_name?.split(",")[0] ||
            `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setLocationLabel(label);
        } catch {
          setLocationLabel(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
        setLocating(false);
      },
      () => {
        toast.error("Standort konnte nicht ermittelt werden");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  async function handleSearch() {
    if (!locationSearch.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=4`,
        { headers: { "Accept-Language": "de" } }
      );
      const data: NominatimResult[] = await res.json();
      setSearchResults(data);
    } catch {
      toast.error("Suche fehlgeschlagen");
    }
    setSearching(false);
  }

  function selectResult(result: NominatimResult) {
    setLat(parseFloat(result.lat));
    setLng(parseFloat(result.lon));
    const label = result.display_name.split(",").slice(0, 2).join(",").trim();
    setLocationLabel(label);
    setSearchResults([]);
    setLocationSearch("");
  }

  function clearLocation() {
    setLat(null);
    setLng(null);
    setLocationLabel("");
    setSearchResults([]);
    setLocationSearch("");
  }

  function handleSubmit() {
    if (lat === null || lng === null) {
      toast.error("Bitte wähle einen Standort aus");
      return;
    }
    startTransition(async () => {
      const result = await createAlert({
        tcg: selectedTcg,
        max_radius_km: radius,
        days_of_week: days,
        lat,
        lng,
      });
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Alert eingerichtet");
        router.refresh();
        onCreated?.();
      }
    });
  }

  return (
    <div className="rounded-xl bg-primary/15 border-2 border-primary p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-1">Neuen Alert einrichten</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Du wirst benachrichtigt, sobald eine passende Session erstellt wird.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* TCG */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">TCG</label>
          <select
            value={selectedTcg}
            onChange={(e) => setSelectedTcg(e.target.value)}
            className="w-full rounded-[10px] border-2 border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
          >
            {TCG_LIST.map((tcg) => (
              <option key={tcg.id} value={tcg.id}>
                {tcg.name}
              </option>
            ))}
          </select>
        </div>

        {/* Radius */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Max. Radius</label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full rounded-[10px] border-2 border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold">
          Standort <span className="font-normal text-muted-foreground">(Mittelpunkt des Radius)</span>
        </label>

        {lat !== null ? (
          /* Selected location display */
          <div className="flex items-center gap-2 rounded-[10px] border-2 border-primary bg-primary/15 px-3 py-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="flex-1 text-xs font-medium truncate">{locationLabel}</span>
            <button
              type="button"
              onClick={clearLocation}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* Location picker */
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGPS}
              disabled={locating}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-border bg-card px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                locating
                  ? "opacity-60 cursor-default"
                  : "hover:border-primary hover:text-primary"
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              {locating ? "Standort wird ermittelt..." : "Aktuellen Standort verwenden"}
            </button>

            <div className="flex items-center gap-1.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">oder</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Stadt oder Ort eingeben..."
                className="flex-1 rounded-[10px] border-2 border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !locationSearch.trim()}
                className={cn(
                  "flex items-center justify-center rounded-[10px] border-2 border-border bg-card px-3 py-2 transition-colors cursor-pointer",
                  searching || !locationSearch.trim()
                    ? "opacity-40 cursor-default"
                    : "hover:border-primary hover:text-primary"
                )}
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-[10px] border-2 border-border bg-card overflow-hidden">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectResult(r)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0"
                  >
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2 text-muted-foreground">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Days */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold">Tage</label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                "flex-1 rounded-lg border-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer",
                days.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Nur Sessions an diesen Tagen werden berücksichtigt
        </p>
      </div>

      <div className="rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        ✅ Sobald jemand eine{" "}
        <strong className="text-foreground">
          {TCG_LIST.find((t) => t.id === selectedTcg)?.shortName}
        </strong>
        -Session innerhalb von{" "}
        <strong className="text-foreground">{radius} km</strong>
        {locationLabel ? (
          <>
            {" "}um{" "}
            <strong className="text-foreground">{locationLabel}</strong>
          </>
        ) : (
          " um deinen Standort"
        )}{" "}
        erstellt, wirst du benachrichtigt.
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={pending || lat === null}
          className="flex-1 rounded-xl text-xs"
          size="sm"
        >
          {pending ? "Wird erstellt..." : "Alert aktivieren"}
        </Button>
        <Button
          onClick={() => onCreated?.()}
          disabled={pending}
          variant="outline"
          className="rounded-xl text-xs"
          size="sm"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
