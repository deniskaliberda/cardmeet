"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TCG_LIST } from "@/lib/config/tcg";
import { ArrowRight, ArrowLeft, MapPin, Check } from "lucide-react";

type FormatSelection = Record<string, string>; // tcgId → formatId

const STEPS = ["Profil", "Standort", "Spiele"] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [username, setUsername] = useState("");

  // Step 2
  const [city, setCity] = useState("");

  // Step 3
  const [selectedTcgs, setSelectedTcgs] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<FormatSelection>({});

  function toggleTcg(tcgId: string) {
    setSelectedTcgs((prev) => {
      if (prev.includes(tcgId)) {
        // deselect → also clear format
        const next = { ...selectedFormats };
        delete next[tcgId];
        setSelectedFormats(next);
        return prev.filter((id) => id !== tcgId);
      }
      return [...prev, tcgId];
    });
  }

  function selectFormat(tcgId: string, formatId: string) {
    setSelectedFormats((prev) => ({
      ...prev,
      [tcgId]: prev[tcgId] === formatId ? "" : formatId,
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Nicht eingeloggt");
      router.push("/login");
      return;
    }

    const preferredFormats = selectedTcgs
      .filter((tcgId) => selectedFormats[tcgId])
      .map((tcgId) => ({ tcg: tcgId, format: selectedFormats[tcgId] }));

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      city: city.trim() || null,
      preferred_tcgs: selectedTcgs,
      preferred_formats: preferredFormats,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Benutzername bereits vergeben");
      } else {
        toast.error("Profil konnte nicht erstellt werden", {
          description: error.message,
        });
      }
      setLoading(false);
      return;
    }

    toast.success("Willkommen bei CardMeet!");
    router.push("/sessions");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div
        className="mb-8 text-primary"
        style={{
          fontFamily: "var(--font-mono), 'Fira Code', monospace",
          fontSize: "1.5rem",
          fontWeight: 300,
          letterSpacing: "-2px",
        }}
      >
        CARDMEET
      </div>

      {/* Progress bar */}
      <div className="mb-8 w-full max-w-md">
        <div className="mb-2 flex justify-between">
          {STEPS.map((label, i) => {
            const s = i + 1;
            const done = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: done || active ? "var(--primary)" : "var(--border)",
                    background: done
                      ? "var(--primary)"
                      : active
                      ? "rgba(0,102,255,0.08)"
                      : "var(--card)",
                    color: done ? "#fff" : active ? "var(--primary)" : "var(--muted-foreground)",
                  }}
                >
                  {done ? <Check className="h-4 w-4" /> : s}
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
        {/* Connector line */}
        <div className="relative -mt-10 flex items-center px-4">
          <div className="h-px flex-1 bg-border" />
          <div
            className="h-px flex-1 transition-all duration-500"
            style={{
              background: step >= 2 ? "var(--primary)" : "var(--border)",
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        {/* ── Step 1: Profil ── */}
        {step === 1 && (
          <div className="space-y-6">
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
              disabled={username.trim().length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username.trim())}
              onClick={() => setStep(2)}
            >
              Weiter <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Step 2: Standort ── */}
        {step === 2 && (
          <div className="space-y-6">
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
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Deine Spiele</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Wähle deine TCGs und bevorzugtes Format — oder überspringe diesen Schritt.
              </p>
            </div>

            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "360px" }}>
              {TCG_LIST.map((tcg) => {
                const isSelected = selectedTcgs.includes(tcg.id);
                return (
                  <div key={tcg.id} className="overflow-hidden rounded-xl border-2 transition-all"
                    style={{ borderColor: isSelected ? tcg.color : "var(--border)" }}
                  >
                    {/* TCG row */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        background: isSelected ? `${tcg.color}10` : "var(--card)",
                      }}
                      onClick={() => toggleTcg(tcg.id)}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: tcg.color }}
                      >
                        {tcg.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold">{tcg.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tcg.formats.length} Format{tcg.formats.length !== 1 ? "e" : ""}
                        </div>
                      </div>
                      <div
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                        style={{
                          borderColor: isSelected ? tcg.color : "var(--border)",
                          background: isSelected ? tcg.color : "transparent",
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>

                    {/* Format pills (only when TCG selected) */}
                    {isSelected && (
                      <div className="border-t px-4 py-3" style={{ borderColor: `${tcg.color}30`, background: `${tcg.color}06` }}>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Bevorzugtes Format:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tcg.formats.map((fmt) => {
                            const fmtSelected = selectedFormats[tcg.id] === fmt.id;
                            return (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => selectFormat(tcg.id, fmt.id)}
                                className="rounded-full border-2 px-3 py-1 text-xs font-medium transition-all"
                                style={
                                  fmtSelected
                                    ? { background: tcg.color, borderColor: tcg.color, color: "#fff" }
                                    : { background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }
                                }
                              >
                                {fmt.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                disabled={loading || selectedTcgs.length > 0 && selectedTcgs.some((id) => !selectedFormats[id])}
                onClick={handleSubmit}
              >
                {loading
                  ? "Speichern..."
                  : selectedTcgs.length > 0
                  ? "Loslegen 🎴"
                  : "Loslegen"}
              </Button>
              {selectedTcgs.length > 0 && selectedTcgs.some((id) => !selectedFormats[id]) && (
                <p className="text-center text-xs text-muted-foreground">
                  Bitte für jedes gewählte Spiel ein Format wählen.
                </p>
              )}
              {selectedTcgs.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Noch unentschlossen? Kein Problem — du kannst das später im Profil ändern.
                </p>
              )}
            </div>

            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="h-3 w-3" /> Zurück
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
