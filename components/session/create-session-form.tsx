"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";
import { createSession } from "@/app/(app)/sessions/create/actions";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  Users,
  Pencil,
  Sparkles,
} from "lucide-react";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
};

export function CreateSessionForm() {
  const [tcgId, setTcgId] = useState("");
  const [formatId, setFormatId] = useState("");
  const [powerLevel, setPowerLevel] = useState("");
  const [step, setStep] = useState(1);

  // Location geocoding state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [resolvedLat, setResolvedLat] = useState("52.52");
  const [resolvedLng, setResolvedLng] = useState("13.405");
  const [resolvedCity, setResolvedCity] = useState("");
  const [resolvedPostalCode, setResolvedPostalCode] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (locationQuery.length < 3) {
      setLocationResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery + " Deutschland")}&countrycodes=de&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "de" } }
        );
        const data: NominatimResult[] = await res.json();
        setLocationResults(data);
        setShowResults(true);
      } catch {
        // silently fail
      }
    }, 400);
  }, [locationQuery]);

  function selectLocation(result: NominatimResult) {
    const city =
      result.address.city ??
      result.address.town ??
      result.address.village ??
      "";
    setResolvedLat(result.lat);
    setResolvedLng(result.lon);
    setResolvedCity(city);
    setResolvedPostalCode(result.address.postcode ?? "");
    setLocationLabel(result.display_name.split(",").slice(0, 2).join(","));
    setLocationQuery("");
    setLocationResults([]);
    setShowResults(false);
  }

  const tcg = tcgId ? getTCG(tcgId) : undefined;
  const format = tcg?.formats.find((f) => f.id === formatId);
  const hasPowerLevels = (format?.powerLevels?.length ?? 0) > 0;

  const totalSteps = 3;

  async function handleSubmit(formData: FormData) {
    const result = await createSession(formData);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="tcg" value={tcgId} />
      <input type="hidden" name="format" value={formatId} />
      {powerLevel && <input type="hidden" name="power_level" value={powerLevel} />}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {[
            { num: 1, label: "Spiel" },
            { num: 2, label: "Details" },
            { num: 3, label: "Wann & Wo" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span className={`text-sm hidden sm:inline ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < 2 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </div>
          ))}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* ==================== STEP 1: Spiel ==================== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* TCG Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Welches Spiel?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TCG_LIST.map((t) => {
                  const isSelected = tcgId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`relative flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition-all ${
                        isSelected
                          ? "border-current shadow-sm"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                      style={isSelected ? { color: t.color, borderColor: t.color } : undefined}
                      onClick={() => {
                        setTcgId(t.id);
                        setFormatId("");
                        setPowerLevel("");
                      }}
                    >
                      {isSelected && (
                        <Check className="absolute right-2 top-2 h-3.5 w-3.5" />
                      )}
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.shortName}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Format Selection */}
          {tcg && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Format</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formatId} onValueChange={(v) => { setFormatId(v ?? ""); setPowerLevel(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Format wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {tcg.formats.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Power Level Selection */}
          {hasPowerLevels && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Power Level</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Waehle das Niveau, damit Mitspieler passende Decks mitbringen
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {format!.powerLevels!.map((pl) => {
                    const isSelected = powerLevel === String(pl.level);
                    return (
                      <button
                        key={pl.level}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                          isSelected
                            ? "shadow-md"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        }`}
                        style={
                          isSelected
                            ? { borderColor: pl.color, boxShadow: `0 0 12px ${pl.color}35` }
                            : undefined
                        }
                        onClick={() => setPowerLevel(String(pl.level))}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: pl.color }}
                        >
                          {pl.level}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{pl.name}</span>
                            {isSelected && (
                              <Check className="h-4 w-4" style={{ color: pl.color }} />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{pl.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Player Count */}
          {format && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Max. Spieler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  name="max_players"
                  type="number"
                  min={format.playerCount.min}
                  max={format.playerCount.max}
                  defaultValue={format.playerCount.default}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Du als Host zaehlst bereits als Spieler 1
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!tcgId || !formatId || (hasPowerLevels && !powerLevel)}
            onClick={() => setStep(2)}
          >
            Weiter
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ==================== STEP 2: Details ==================== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary from Step 1 */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {tcg && (
                <Badge style={{ backgroundColor: tcg.color, color: "#fff" }}>
                  {tcg.shortName}
                </Badge>
              )}
              {format && <Badge variant="outline">{format.name}</Badge>}
              {powerLevel && format?.powerLevels && (() => {
                const pl = format.powerLevels.find((p) => p.level === Number(powerLevel));
                return pl ? (
                  <Badge variant="outline" style={{ borderColor: pl.color, color: pl.color }}>
                    Lvl {pl.level} — {pl.name}
                  </Badge>
                ) : null;
              })()}
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(1)}
              title="Auswahl ändern"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pencil className="h-4 w-4 text-primary" />
                Beschreibe deine Runde
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ein guter Titel hilft anderen, die passende Session zu finden
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={
                    tcgId === "magic" && formatId === "commander"
                      ? "z.B. Casual Commander Runde am Abend"
                      : tcgId === "pokemon"
                      ? "z.B. Pokemon Standard Training"
                      : "z.B. Entspannte Runde nach Feierabend"
                  }
                  required
                  minLength={3}
                  maxLength={100}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Beschreibung
                  <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Erzähl etwas über die Runde — z.B. welche Regeln gelten, ob Proxys erlaubt sind, ob es Snacks gibt..."
                  maxLength={500}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurueck
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => setStep(3)}
            >
              Weiter
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: Wann & Wo ==================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {tcg && (
                <Badge style={{ backgroundColor: tcg.color, color: "#fff" }}>
                  {tcg.shortName}
                </Badge>
              )}
              {format && <Badge variant="outline">{format.name}</Badge>}
              {powerLevel && format?.powerLevels && (() => {
                const pl = format.powerLevels.find((p) => p.level === Number(powerLevel));
                return pl ? (
                  <Badge variant="outline" style={{ borderColor: pl.color, color: pl.color }}>
                    Lvl {pl.level}
                  </Badge>
                ) : null;
              })()}
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(1)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Wann geht's los?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                name="scheduled_at"
                type="datetime-local"
                required
                min={new Date().toISOString().slice(0, 16)}
                className="text-base"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Wo trefft ihr euch?
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Adresse oder Ort suchen — PLZ wird automatisch ermittelt
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address search */}
              <div className="space-y-2">
                <Label>Adresse / Ort suchen</Label>
                <div className="relative">
                  <Input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="z.B. Alexanderplatz Berlin oder 10178..."
                    className="text-base"
                    autoComplete="off"
                  />
                  {showResults && locationResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
                      {locationResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60 first:rounded-t-xl last:rounded-b-xl"
                          onClick={() => selectLocation(r)}
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                          <span className="line-clamp-2 text-xs">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resolved location display */}
              {locationLabel && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{locationLabel}</p>
                    {resolvedPostalCode && (
                      <p className="text-xs text-muted-foreground">
                        PLZ: {resolvedPostalCode} · {resolvedCity}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setLocationLabel("");
                      setResolvedCity("");
                      setResolvedPostalCode("");
                      setResolvedLat("52.52");
                      setResolvedLng("13.405");
                    }}
                  >
                    ändern
                  </button>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="location_name" className="flex items-center gap-1">
                  Treffpunkt
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="location_name"
                  name="location_name"
                  placeholder="z.B. Café XY, Spieleladen, bei mir zu Hause..."
                />
                <p className="text-xs text-muted-foreground">
                  Tipp: Viele Gruppen klären den genauen Ort erst im Session-Chat.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Hidden fields */}
          <input type="hidden" name="lat" value={resolvedLat} />
          <input type="hidden" name="lng" value={resolvedLng} />
          <input type="hidden" name="city" value={resolvedCity || "Berlin"} />
          <input type="hidden" name="postal_code" value={resolvedPostalCode} />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurueck
            </Button>
            <Button type="submit" className="flex-1" size="lg">
              Session erstellen
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
