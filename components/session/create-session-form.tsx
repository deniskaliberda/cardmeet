"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";
import { createSession } from "@/app/(app)/sessions/create/actions";
import { toast } from "sonner";
import { Check, ChevronLeft, MapPin, Minus, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type StepId =
  | "tcg"
  | "format"
  | "power_level"
  | "players"
  | "title"
  | "description"
  | "datetime"
  | "location";

const ALL_STEPS: StepId[] = [
  "tcg",
  "format",
  "power_level",
  "players",
  "title",
  "description",
  "datetime",
  "location",
];

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: { postcode?: string; city?: string; town?: string; village?: string };
};

type Friend = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

export function CreateSessionForm({ friends = [] }: { friends?: Friend[] }) {
  const [step, setStep] = useState<StepId>("tcg");
  const [tcgId, setTcgId] = useState("");
  const [formatId, setFormatId] = useState("");
  const [powerLevel, setPowerLevel] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationName, setLocationName] = useState("");

  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);

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
    if (locationQuery.length < 3) { setLocationResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery + " Deutschland")}&countrycodes=de&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "de" } }
        );
        setLocationResults(await res.json());
        setShowResults(true);
      } catch {}
    }, 400);
  }, [locationQuery]);

  function selectLocation(r: NominatimResult) {
    const city = r.address.city ?? r.address.town ?? r.address.village ?? "";
    setResolvedLat(r.lat);
    setResolvedLng(r.lon);
    setResolvedCity(city);
    setResolvedPostalCode(r.address.postcode ?? "");
    setLocationLabel(r.display_name.split(",").slice(0, 2).join(","));
    setLocationQuery("");
    setLocationResults([]);
    setShowResults(false);
  }

  const tcg = tcgId ? getTCG(tcgId) : undefined;
  const format = tcg?.formats.find((f) => f.id === formatId);
  const hasPowerLevels = (format?.powerLevels?.length ?? 0) > 0;

  function activeSteps(): StepId[] {
    return ALL_STEPS.filter((s) => s !== "power_level" || hasPowerLevels);
  }

  function advance(from: StepId) {
    const steps = activeSteps();
    const next = steps[steps.indexOf(from) + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const steps = activeSteps();
    const prev = steps[steps.indexOf(step) - 1];
    if (prev) setStep(prev);
  }

  const steps = activeSteps();
  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isFirst = stepIndex === 0;

  async function handleSubmit(formData: FormData) {
    // Inject controlled state into the FormData
    formData.set("tcg", tcgId);
    formData.set("format", formatId);
    if (powerLevel) formData.set("power_level", powerLevel);
    formData.set("max_players", String(maxPlayers));
    formData.set("title", title);
    if (description) formData.set("description", description);
    formData.set("scheduled_at", scheduledAt);
    formData.set("lat", resolvedLat);
    formData.set("lng", resolvedLng);
    formData.set("city", resolvedCity || "Berlin");
    formData.set("postal_code", resolvedPostalCode);
    formData.set("location_name", locationName);
    if (invitedFriendIds.length > 0) {
      formData.set("invited_friend_ids", invitedFriendIds.join(","));
    }

    const result = await createSession(formData);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={handleSubmit} className="mx-auto max-w-lg">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Schritt {stepIndex + 1} von {steps.length}
          </span>
          {!isFirst && (
            <button
              type="button"
              onClick={goBack}
              className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Animated step content */}
      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">

        {/* ── Step: TCG ─────────────────────────────────────────── */}
        {step === "tcg" && (
          <div className="space-y-5">
            <StepHeading title="Welches Spiel?" sub="Wähle das TCG für deine Session" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {TCG_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTcgId(t.id);
                    setFormatId("");
                    setPowerLevel("");
                    advance("tcg");
                  }}
                  className="relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md cursor-pointer"
                  style={{
                    borderColor: tcgId === t.id ? t.color : "var(--border)",
                    background: tcgId === t.id ? `${t.color}10` : "var(--card)",
                  }}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-sm font-semibold leading-tight">{t.shortName}</span>
                  {tcgId === t.id && (
                    <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5" style={{ color: t.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Format ──────────────────────────────────────── */}
        {step === "format" && tcg && (
          <div className="space-y-5">
            <div>
              <span
                className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: `${tcg.color}15`, color: tcg.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tcg.color }} />
                {tcg.shortName}
              </span>
              <StepHeading title="Welches Format?" sub="Wähle das Spielformat" />
            </div>
            <div className="flex flex-col gap-2.5">
              {tcg.formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFormatId(f.id);
                    setPowerLevel("");
                    setMaxPlayers(f.playerCount.default);
                    // Use fresh format data directly to avoid stale-state skip of power_level
                    const newHasPowerLevels = (f.powerLevels?.length ?? 0) > 0;
                    const steps = ALL_STEPS.filter((s) => s !== "power_level" || newHasPowerLevels);
                    const next = steps[steps.indexOf("format") + 1];
                    if (next) setStep(next);
                  }}
                  className="flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-sm cursor-pointer"
                  style={{
                    borderColor: formatId === f.id ? tcg.color : "var(--border)",
                    background: formatId === f.id ? `${tcg.color}08` : "var(--card)",
                  }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.playerCount.min}–{f.playerCount.max} Spieler
                    </div>
                  </div>
                  {formatId === f.id && (
                    <Check className="h-4 w-4 shrink-0" style={{ color: tcg.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Power Level ─────────────────────────────────── */}
        {step === "power_level" && format?.powerLevels && (
          <div className="space-y-5">
            <StepHeading
              title="Power Level?"
              sub="Damit Mitspieler passende Decks mitbringen"
            />
            <div className="flex flex-col gap-2.5">
              {format.powerLevels.map((pl) => (
                <button
                  key={pl.level}
                  type="button"
                  onClick={() => {
                    setPowerLevel(String(pl.level));
                    advance("power_level");
                  }}
                  className="flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all hover:shadow-sm cursor-pointer"
                  style={{
                    borderColor: powerLevel === String(pl.level) ? pl.color : "var(--border)",
                    background: powerLevel === String(pl.level) ? `${pl.color}08` : "var(--card)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: pl.color }}
                  >
                    {pl.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{pl.name}</div>
                    <div className="text-xs text-muted-foreground">{pl.description}</div>
                  </div>
                  {powerLevel === String(pl.level) && (
                    <Check className="h-4 w-4 shrink-0" style={{ color: pl.color }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Players ─────────────────────────────────────── */}
        {step === "players" && format && (
          <div className="space-y-6">
            <StepHeading
              title="Wie viele Spieler?"
              sub="Du als Host zählst bereits als Spieler 1"
            />
            <div className="flex items-center justify-center gap-8 py-4">
              <button
                type="button"
                onClick={() => setMaxPlayers((p) => Math.max(format.playerCount.min, p - 1))}
                disabled={maxPlayers <= format.playerCount.min}
                className={cn(
                  "flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 transition-all",
                  maxPlayers <= format.playerCount.min
                    ? "border-border text-muted-foreground opacity-40"
                    : "border-border hover:border-primary hover:text-primary"
                )}
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="font-heading text-7xl font-semibold leading-none text-primary">
                  {maxPlayers}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Spieler max.</div>
              </div>
              <button
                type="button"
                onClick={() => setMaxPlayers((p) => Math.min(format.playerCount.max, p + 1))}
                disabled={maxPlayers >= format.playerCount.max}
                className={cn(
                  "flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 transition-all",
                  maxPlayers >= format.playerCount.max
                    ? "border-border text-muted-foreground opacity-40"
                    : "border-border hover:border-primary hover:text-primary"
                )}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Friend invite */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Freunde einladen</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              {friends.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Du hast noch keine Freunde.{" "}
                    <a href="/friends" className="text-primary underline-offset-2 hover:underline">
                      Jetzt Freunde hinzufügen →
                    </a>
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {friends.map((friend) => {
                      const invited = invitedFriendIds.includes(friend.user_id);
                      return (
                        <button
                          key={friend.user_id}
                          type="button"
                          onClick={() =>
                            setInvitedFriendIds((prev) =>
                              invited
                                ? prev.filter((id) => id !== friend.user_id)
                                : [...prev, friend.user_id]
                            )
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
                            invited
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-foreground hover:border-primary/50"
                          )}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {friend.username.slice(0, 2).toUpperCase()}
                          </span>
                          {friend.username}
                          {invited && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                  {invitedFriendIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {invitedFriendIds.length} Freund{invitedFriendIds.length > 1 ? "e" : ""} wird nach dem Erstellen benachrichtigt
                    </p>
                  )}
                </>
              )}
            </div>

            <Button
              type="button"
              className="w-full rounded-2xl"
              size="lg"
              onClick={() => advance("players")}
            >
              Weiter
            </Button>
          </div>
        )}

        {/* ── Step: Title ───────────────────────────────────────── */}
        {step === "title" && (
          <div className="space-y-5">
            <StepHeading
              title="Wie heißt deine Runde?"
              sub="Ein guter Titel hilft anderen, dich zu finden"
            />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                tcgId === "magic" && formatId === "commander"
                  ? "z.B. Casual Commander Runde am Abend"
                  : tcgId === "pokemon"
                  ? "z.B. Pokémon Standard Training"
                  : "z.B. Entspannte Runde nach Feierabend"
              }
              className="h-14 rounded-2xl text-base"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim().length >= 3) advance("title");
              }}
            />
            <Button
              type="button"
              className="w-full rounded-2xl"
              size="lg"
              disabled={title.trim().length < 3}
              onClick={() => advance("title")}
            >
              Weiter
            </Button>
          </div>
        )}

        {/* ── Step: Description ─────────────────────────────────── */}
        {step === "description" && (
          <div className="space-y-5">
            <StepHeading
              title="Kurze Beschreibung?"
              sub="Optional — z.B. Hausregeln, ob Proxys ok sind, Snacks..."
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Erzähl etwas über die Runde..."
              className="min-h-[140px] resize-none rounded-2xl text-base"
              maxLength={500}
              autoFocus
            />
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => { setDescription(""); advance("description"); }}
              >
                Überspringen
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl"
                onClick={() => advance("description")}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: DateTime ────────────────────────────────────── */}
        {step === "datetime" && (
          <div className="space-y-5">
            <StepHeading
              title="Wann geht's los?"
              sub="Datum und Uhrzeit der Session"
            />
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-14 rounded-2xl text-base"
              min={new Date().toISOString().slice(0, 16)}
              autoFocus
            />
            <Button
              type="button"
              className="w-full rounded-2xl"
              size="lg"
              disabled={!scheduledAt}
              onClick={() => advance("datetime")}
            >
              Weiter
            </Button>
          </div>
        )}

        {/* ── Step: Location ────────────────────────────────────── */}
        {step === "location" && (
          <div className="space-y-5">
            <StepHeading
              title="Wo trefft ihr euch?"
              sub="Stadt, PLZ oder Adresse eingeben"
            />

            {!locationLabel ? (
              <div className="relative">
                <Input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="z.B. Alexanderplatz Berlin oder 10178..."
                  className="h-14 rounded-2xl text-base"
                  autoComplete="off"
                  autoFocus
                />
                {showResults && locationResults.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border-2 border-border bg-card shadow-lg">
                    {locationResults.map((r) => (
                      <button
                        key={r.place_id}
                        type="button"
                        className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectLocation(r)}
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="line-clamp-2 text-sm">{r.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{locationLabel}</p>
                  {resolvedPostalCode && (
                    <p className="text-xs text-muted-foreground">
                      PLZ {resolvedPostalCode} · {resolvedCity}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Genauer Treffpunkt{" "}
                <span className="font-normal">(optional)</span>
              </Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="z.B. Café XY, Spieleladen, bei mir zu Hause..."
                className="rounded-2xl"
              />
              <p className="text-xs text-muted-foreground">
                Tipp: Viele Gruppen klären den genauen Ort im Session-Chat.
              </p>
            </div>

            <Button type="submit" className="w-full rounded-2xl" size="lg">
              Session erstellen 🎴
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] mb-1">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
