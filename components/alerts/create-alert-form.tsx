"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TCG_LIST } from "@/lib/config/tcg";
import { createAlert } from "@/app/(app)/alerts/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export function CreateAlertForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedTcg, setSelectedTcg] = useState(TCG_LIST[0].id);
  const [radius, setRadius] = useState(25);
  const [days, setDays] = useState<number[]>([5, 6]); // Sa, So default

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createAlert({
        tcg: selectedTcg,
        max_radius_km: radius,
        days_of_week: days,
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
    <div className="rounded-xl bg-primary/5 border-2 border-primary p-5 space-y-4">
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

      <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        ✅ Sobald jemand eine{" "}
        <strong className="text-foreground">
          {TCG_LIST.find((t) => t.id === selectedTcg)?.shortName}
        </strong>
        -Session innerhalb von{" "}
        <strong className="text-foreground">{radius} km</strong> erstellt, wirst
        du benachrichtigt.
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={pending}
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
