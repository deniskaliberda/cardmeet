"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TCG_LIST, getTCG } from "@/lib/config/tcg";
import { createLfgPost } from "@/app/(app)/lfg/actions";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  preferredTcgs?: string[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  onClose: () => void;
};

const DATE_PRESETS = [
  { id: "today", label: "Heute" },
  { id: "tomorrow", label: "Morgen" },
] as const;

const TIME_PRESETS = [
  { id: "afternoon", label: "Nachmittag", from: 14, to: 18 },
  { id: "evening", label: "Abend", from: 18, to: 22 },
  { id: "allday", label: "Ganzer Tag", from: 10, to: 22 },
] as const;

const RADIUS_OPTIONS = [5, 10, 25] as const;

export function LfgQuickForm({ preferredTcgs, userLat, userLng, userCity, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [tcg, setTcg] = useState(preferredTcgs?.[0] ?? "");
  const [datePreset, setDatePreset] = useState<string>("today");
  const [timePreset, setTimePreset] = useState<string>("evening");
  const [radius, setRadius] = useState(10);

  function getDateFromPreset(preset: string): Date {
    const d = new Date();
    if (preset === "tomorrow") d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function handleSubmit() {
    if (!tcg) { toast.error("Bitte wähle ein TCG"); return; }

    const baseDate = getDateFromPreset(datePreset);
    const timeConfig = TIME_PRESETS.find((t) => t.id === timePreset) ?? TIME_PRESETS[1];

    const from = new Date(baseDate);
    from.setHours(timeConfig.from, 0, 0, 0);
    const to = new Date(baseDate);
    to.setHours(timeConfig.to, 0, 0, 0);

    // Don't allow past times
    if (to.getTime() <= Date.now()) {
      toast.error("Der Zeitraum liegt in der Vergangenheit");
      return;
    }

    startTransition(async () => {
      const result = await createLfgPost({
        tcg,
        max_radius_km: radius,
        lat: userLat ?? 52.52,
        lng: userLng ?? 13.405,
        location_label: userCity ?? "Berlin",
        available_from: from.toISOString(),
        available_to: to.toISOString(),
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (result.status === "matched") {
        toast.success("Match gefunden! Session wurde erstellt", {
          action: {
            label: "Zur Session",
            onClick: () => router.push(`/sessions/${result.sessionId}`),
          },
        });
      } else {
        toast.success("LFG aktiv! Du wirst benachrichtigt, wenn ein Match gefunden wird.");
      }
      onClose();
    });
  }

  const tcgConfig = tcg ? getTCG(tcg) : null;

  return (
    <div className="space-y-5 p-1">
      {/* TCG selection */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Was spielst du?</p>
        <div className="flex flex-wrap gap-2">
          {TCG_LIST.map((t) => {
            const selected = tcg === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTcg(t.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                  selected
                    ? "text-white"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
                style={selected ? {
                  borderColor: t.color,
                  background: `linear-gradient(135deg, ${t.color}, ${t.color}CC)`,
                  boxShadow: `0 2px 12px ${t.color}40`,
                } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selected ? "#fff" : t.color }}
                />
                {t.shortName}
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date selection */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Wann?</p>
        <div className="flex gap-2">
          {DATE_PRESETS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDatePreset(d.id)}
              className={cn(
                "flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all cursor-pointer",
                datePreset === d.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time selection */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Uhrzeit?</p>
        <div className="flex gap-2">
          {TIME_PRESETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimePreset(t.id)}
              className={cn(
                "flex-1 rounded-xl border-2 py-2 text-center text-xs font-semibold transition-all cursor-pointer",
                timePreset === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <div>{t.label}</div>
              <div className="text-[10px] font-normal opacity-70">{t.from}-{t.to} Uhr</div>
            </button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Umkreis · {userCity ?? "Berlin"}
        </p>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={cn(
                "flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-all cursor-pointer",
                radius === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!tcg || pending}
        className="w-full rounded-2xl py-6 text-base font-bold"
        style={tcgConfig ? {
          background: `linear-gradient(135deg, ${tcgConfig.color}, ${tcgConfig.color}BB)`,
          boxShadow: `0 4px 20px ${tcgConfig.color}30`,
        } : undefined}
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "LFG starten"
        )}
      </Button>
    </div>
  );
}
