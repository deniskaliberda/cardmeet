"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TCG_LIST } from "@/lib/config/tcg";
import { ArrowRight, ArrowLeft, MapPin, Check, Loader2 } from "lucide-react";

type CityResult = {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address: { city?: string; town?: string; village?: string; state?: string };
};

// All supported TCGs
const ALL_TCGS = ["magic", "pokemon", "yugioh", "onepiece", "lorcana"] as const;

const TCG_ICONS: Record<string, string> = {
  magic: "M",
  pokemon: "PK",
  yugioh: "YGO",
  onepiece: "OP",
  lorcana: "L",
};

const STEPS = ["Profil", "Standort", "Spiele"] as const;

export function OnboardingForm({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [username, setUsername] = useState("");

  // Step 2 – city search
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3
  const [selectedTcgs, setSelectedTcgs] = useState<string[]>([]);

  // Nominatim city search
  useEffect(() => {
    if (cityQuery.length < 2) {
      setCityResults([]);
      setShowResults(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&countrycodes=de&format=json&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "de" } }
        );
        const data: CityResult[] = await res.json();
        // Keep only city/town/village results
        const cities = data.filter((r) =>
          r.address.city || r.address.town || r.address.village
        );
        setCityResults(cities.slice(0, 5));
        setShowResults(true);
      } catch {
        // silently ignore network errors
      } finally {
        setCitySearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [cityQuery]);

  function pickCity(result: CityResult) {
    const name =
      result.address.city ?? result.address.town ?? result.address.village ?? result.name;
    setSelectedCity({ name, lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setCityQuery(name);
    setShowResults(false);
    setCityResults([]);
  }

  function clearCity() {
    setSelectedCity(null);
    setCityQuery("");
  }

  function toggleTcg(tcgId: string) {
    setSelectedTcgs((prev) =>
      prev.includes(tcgId) ? prev.filter((id) => id !== tcgId) : [...prev, tcgId]
    );
  }

  async function handleSubmit() {
    if (preview) {
      toast.success("Vorschau: Onboarding abgeschlossen! ✓");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Nicht eingeloggt");
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      city: selectedCity?.name ?? null,
      city_lat: selectedCity?.lat ?? null,
      city_lng: selectedCity?.lng ?? null,
      preferred_tcgs: selectedTcgs,
    });

    if (error) {
      toast.error(
        error.code === "23505"
          ? "Benutzername bereits vergeben"
          : "Profil konnte nicht erstellt werden",
        { description: error.code !== "23505" ? error.message : undefined }
      );
      setLoading(false);
      return;
    }

    toast.success("Willkommen bei CardMeet!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">

      {/* ── Top: Logo + progress ── */}
      <div className="flex flex-shrink-0 flex-col items-center px-4 pb-4 pt-6">
        <div
          className="mb-5 text-primary"
          style={{
            fontFamily: "var(--font-mono), 'Fira Code', monospace",
            fontSize: "1.4rem",
            fontWeight: 300,
            letterSpacing: "-2px",
          }}
        >
          CARDMEET
        </div>

        {preview && (
          <div className="mb-4 w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-700">
            Vorschau-Modus — Daten werden nicht gespeichert
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="relative flex items-start justify-between">
            <div className="absolute left-4 right-4 top-4 flex -translate-y-1/2 items-center">
              <div className="h-px flex-1" style={{ background: step >= 2 ? "var(--primary)" : "var(--border)", transition: "background 0.4s" }} />
              <div className="h-px flex-1" style={{ background: step >= 3 ? "var(--primary)" : "var(--border)", transition: "background 0.4s" }} />
            </div>
            {STEPS.map((label, i) => {
              const s = i + 1;
              const done = step > s;
              const active = step === s;
              return (
                <div key={label} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300"
                    style={{
                      borderColor: done || active ? "var(--primary)" : "var(--border)",
                      background: done ? "var(--primary)" : active ? "rgba(0,102,255,0.08)" : "var(--background)",
                      color: done ? "#fff" : active ? "var(--primary)" : "var(--muted-foreground)",
                    }}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s}
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: active ? "var(--primary)" : "var(--muted-foreground)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Card area ── */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <div
          className="flex w-full max-w-md flex-col rounded-2xl border-2 border-border bg-card"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >

          {/* ── Step 1: Profil ── */}
          {step === 1 && (
            <div className="space-y-6 p-8">
              <div>
                <h1 className="text-2xl font-semibold">Willkommen! 👋</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Wähle einen Benutzernamen für dein CardMeet-Profil.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  placeholder="z.B. magic_max"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  autoFocus
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  3–30 Zeichen, nur Buchstaben, Zahlen, _ und -
                </p>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={!preview && (username.trim().length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username.trim()))}
                onClick={() => setStep(2)}
              >
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Standort ── */}
          {step === 2 && (
            <div className="space-y-6 p-8">
              <div>
                <h1 className="text-2xl font-semibold">Wo spielst du?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  So zeigen wir dir Sessions in deiner Nähe.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  <MapPin className="mr-1.5 inline h-3.5 w-3.5" />
                  Stadt
                </Label>
                <div className="relative">
                  <Input
                    id="city"
                    placeholder="z.B. Hamburg"
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      if (selectedCity) setSelectedCity(null);
                    }}
                    autoFocus
                    autoComplete="off"
                    className="text-base pr-8"
                  />
                  {citySearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                  {selectedCity && (
                    <button
                      type="button"
                      onClick={clearCity}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}

                  {/* Dropdown */}
                  {showResults && cityResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      {cityResults.map((r, i) => {
                        const cityName = r.address.city ?? r.address.town ?? r.address.village ?? r.name;
                        const state = r.address.state;
                        return (
                          <button
                            key={i}
                            type="button"
                            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                            onClick={() => pickCity(r)}
                          >
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                            <span className="font-medium">{cityName}</span>
                            {state && (
                              <span className="ml-auto text-xs text-muted-foreground">{state}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirmed selection */}
                {selectedCity && (
                  <p className="flex items-center gap-1.5 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    {selectedCity.name} gefunden
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!preview && !selectedCity}
                  onClick={() => setStep(3)}
                >
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { clearCity(); setStep(3); }}
                >
                  Überspringen
                </Button>
              </div>

              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-3 w-3" /> Zurück
              </button>
            </div>
          )}

          {/* ── Step 3: Spiele ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5 p-6">
              <div>
                <h1 className="text-2xl font-semibold">Was spielst du?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tippe zuerst auf dein <strong>Haupt-TCG</strong>, dann optional weitere.
                </p>
              </div>

              {/* Primary TCG hint */}
              {selectedTcgs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Haupt-TCG:{" "}
                  <span className="font-semibold" style={{ color: TCG_LIST.find((t) => t.id === selectedTcgs[0])?.color }}>
                    {TCG_LIST.find((t) => t.id === selectedTcgs[0])?.shortName}
                  </span>
                  {selectedTcgs.length > 1 && (
                    <span> + {selectedTcgs.length - 1} weitere</span>
                  )}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {ALL_TCGS.map((tcgId) => {
                  const tcg = TCG_LIST.find((t) => t.id === tcgId)!;
                  const isSelected = selectedTcgs.includes(tcgId);
                  const isPrimary = selectedTcgs[0] === tcgId;
                  return (
                    <button
                      key={tcgId}
                      type="button"
                      onClick={() => toggleTcg(tcgId)}
                      className="relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 py-5 transition-all duration-200 cursor-pointer"
                      style={{
                        borderColor: isSelected ? tcg.color : "var(--border)",
                        background: isSelected ? `${tcg.color}12` : "var(--card)",
                        boxShadow: isPrimary
                          ? `0 0 0 2px ${tcg.color}60, 0 4px 16px ${tcg.color}20`
                          : isSelected
                          ? `0 0 0 1px ${tcg.color}40`
                          : "none",
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ background: tcg.color }}
                        >
                          {isPrimary ? (
                            <span className="text-[9px] font-bold text-white">1</span>
                          ) : (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      )}
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white transition-transform"
                        style={{
                          background: tcg.color,
                          transform: isPrimary ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        {TCG_ICONS[tcgId]}
                      </div>
                      <span className="px-2 text-center text-sm font-semibold leading-tight">
                        {tcg.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Speichern..." : selectedTcgs.length > 0 ? "Loslegen 🎴" : "Loslegen"}
                </Button>
                {selectedTcgs.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Noch unentschlossen? Kein Problem — im Profil jederzeit änderbar.
                  </p>
                )}
                <button
                  className="flex items-center justify-center gap-1 pt-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="h-3 w-3" /> Zurück
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
