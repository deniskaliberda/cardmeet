"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TCG_LIST } from "@/lib/config/tcg";
import { createLfgPost } from "@/app/(app)/lfg/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";

type Props = {
  preferredTcgs?: string[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  onClose: () => void;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const TIME_PRESETS = [
  { id: "afternoon", label: "Nachmittag", from: 14, to: 18 },
  { id: "evening", label: "Abend", from: 18, to: 22 },
  { id: "allday", label: "Ganzer Tag", from: 10, to: 22 },
] as const;

export function LfgQuickForm({ preferredTcgs, userLat, userLng, userCity, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Form state
  const [selectedTcg, setSelectedTcg] = useState(preferredTcgs?.[0] ?? TCG_LIST[0].id);
  const [radius, setRadius] = useState(25);
  const [days, setDays] = useState<number[]>([5, 6]); // Sa, So default
  const [timePreset, setTimePreset] = useState<string>("evening");

  // Location state
  const [lat, setLat] = useState<number | null>(userLat ?? null);
  const [lng, setLng] = useState<number | null>(userLng ?? null);
  const [locationLabel, setLocationLabel] = useState<string>(userCity ?? "");
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
    if (days.length === 0) {
      toast.error("Bitte wähle mindestens einen Tag");
      return;
    }

    const timeConfig = TIME_PRESETS.find((t) => t.id === timePreset) ?? TIME_PRESETS[1];

    startTransition(async () => {
      let matched = false;
      let lastSessionId: string | undefined;

      // Create one LFG post per selected day
      for (const dayIndex of days.sort()) {
        const today = new Date();
        const currentDay = today.getDay(); // 0=Sun, 1=Mon, ...
        // Convert our Mo=0..So=6 to JS Day: Mo=1, Di=2, ..., So=0
        const targetJsDay = dayIndex === 6 ? 0 : dayIndex + 1;

        let daysUntil = targetJsDay - currentDay;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0 && today.getHours() >= timeConfig.to) daysUntil = 7;

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);

        const from = new Date(targetDate);
        from.setHours(timeConfig.from, 0, 0, 0);
        const to = new Date(targetDate);
        to.setHours(timeConfig.to, 0, 0, 0);

        if (to.getTime() <= Date.now()) continue;

        const result = await createLfgPost({
          tcg: selectedTcg,
          max_radius_km: radius,
          lat,
          lng,
          location_label: locationLabel || undefined,
          available_from: from.toISOString(),
          available_to: to.toISOString(),
        });

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        if (result.status === "matched") {
          matched = true;
          lastSessionId = result.sessionId;
        }
      }

      if (matched && lastSessionId) {
        toast.success("Match gefunden! Session wurde erstellt", {
          action: {
            label: "Zur Session",
            onClick: () => router.push(`/sessions/${lastSessionId}`),
          },
        });
      } else {
        toast.success("LFG aktiv! Du wirst benachrichtigt, wenn ein Match gefunden wird.");
      }
      onClose();
    });
  }

  const tcgConfig = TCG_LIST.find((t) => t.id === selectedTcg);
  const timeConfig = TIME_PRESETS.find((t) => t.id === timePreset);
  const selectedDayLabels = days.sort().map((d) => DAY_LABELS[d]).join(", ");

  return (
    <div className="space-y-4">
      {/* Header */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Sag uns wann und wo du spielen willst — wir finden Mitspieler und erstellen automatisch eine Session.
      </p>

      {/* TCG + Radius (2-column grid like Alert) */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Location (same pattern as Alert) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold">
          Standort <span className="font-normal text-muted-foreground">(Mittelpunkt des Radius)</span>
        </label>

        {lat !== null ? (
          <div className="flex items-center gap-2 rounded-[10px] border-2 border-primary bg-primary/5 px-3 py-2">
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

      {/* Days (same pattern as Alert) */}
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
      </div>

      {/* Time presets */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold">Uhrzeit</label>
        <div className="flex gap-1.5">
          {TIME_PRESETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimePreset(t.id)}
              className={cn(
                "flex-1 rounded-lg border-2 py-1.5 text-center transition-colors cursor-pointer",
                timePreset === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              <div className="text-[11px] font-semibold">{t.label}</div>
              <div className="text-[9px] font-normal opacity-70">{t.from}–{t.to} Uhr</div>
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        🎯 Du suchst Mitspieler für{" "}
        <strong className="text-foreground">{tcgConfig?.shortName}</strong>
        {days.length > 0 && (
          <>
            {" "}an{" "}
            <strong className="text-foreground">{selectedDayLabels}</strong>
          </>
        )}
        {timeConfig && (
          <>
            {", "}
            <strong className="text-foreground">{timeConfig.from}–{timeConfig.to} Uhr</strong>
          </>
        )}
        {", "}
        <strong className="text-foreground">{radius} km</strong>
        {locationLabel && (
          <>
            {" "}um{" "}
            <strong className="text-foreground">{locationLabel}</strong>
          </>
        )}
        . Sobald ein Match gefunden wird, erstellen wir automatisch eine Session!
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={pending || lat === null || days.length === 0}
          className="flex-1 rounded-xl text-xs"
          size="sm"
        >
          {pending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            "LFG starten"
          )}
        </Button>
        <Button
          onClick={onClose}
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
