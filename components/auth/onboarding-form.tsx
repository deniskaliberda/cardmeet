"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TCG_LIST } from "@/lib/config/tcg";
import { ArrowRight, ArrowLeft, MapPin, Check } from "lucide-react";

// Top 4 TCGs in Deutschland nach Spielerzahl
const TOP_TCGS = ["magic", "pokemon", "yugioh", "onepiece"] as const;

const TCG_ICONS: Record<string, string> = {
  magic: "M",
  pokemon: "PK",
  yugioh: "YGO",
  onepiece: "OP",
};

const STEPS = ["Profil", "Standort", "Spiele"] as const;

export function OnboardingForm({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [selectedTcgs, setSelectedTcgs] = useState<string[]>([]);

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
      city: city.trim() || null,
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
    router.push("/sessions");
    router.refresh();
  }


  return (
    // Full viewport, no page scroll
    <div className="flex h-screen flex-col overflow-hidden bg-background">

      {/* ── Top: Logo + progress ── */}
      <div className="flex flex-shrink-0 flex-col items-center px-4 pb-4 pt-6">
        {/* Logo */}
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

        {/* Preview banner */}
        {preview && (
          <div className="mb-4 w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-700">
            Vorschau-Modus — Daten werden nicht gespeichert
          </div>
        )}

        {/* Step indicators */}
        <div className="w-full max-w-md">
          <div className="relative flex items-start justify-between">
            {/* Connector lines behind dots */}
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

      {/* ── Card area: fills remaining space ── */}
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
                  So können wir dir Sessions in deiner Nähe zeigen.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">
                  <MapPin className="mr-1.5 inline h-3.5 w-3.5" />
                  Stadt
                </Label>
                <Input
                  id="city"
                  placeholder="z.B. Berlin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoFocus
                  className="text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={city.trim().length < 2}
                  onClick={() => setStep(3)}
                >
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { setCity(""); setStep(3); }}
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
                <h1 className="text-2xl font-semibold">Deine Spiele</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Welche TCGs spielst du? Mehrfachauswahl möglich.
                </p>
              </div>

              {/* 2×2 Icon grid */}
              <div className="grid grid-cols-2 gap-3">
                {TOP_TCGS.map((tcgId) => {
                  const tcg = TCG_LIST.find((t) => t.id === tcgId)!;
                  const isSelected = selectedTcgs.includes(tcgId);
                  return (
                    <button
                      key={tcgId}
                      type="button"
                      onClick={() => toggleTcg(tcgId)}
                      className="relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 py-5 transition-all duration-200"
                      style={{
                        borderColor: isSelected ? tcg.color : "var(--border)",
                        background: isSelected ? `${tcg.color}12` : "var(--card)",
                        boxShadow: isSelected ? `0 0 0 1px ${tcg.color}40` : "none",
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ background: tcg.color }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: tcg.color }}
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
