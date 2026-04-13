"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTCG, getPowerLevel } from "@/lib/config/tcg";
import { updateSession } from "@/app/(app)/sessions/actions";
import { toast } from "sonner";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  title: string;
  description?: string | null;
  tcg: string;
  format: string;
  power_level?: number | null;
  max_players: number;
  current_players: number;
  location_name?: string | null;
  scheduled_at: string;
};

export function EditSessionForm({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: (updated: Partial<Session>) => void;
}) {
  const tcg = getTCG(session.tcg);
  const format = tcg?.formats.find((f) => f.id === session.format);
  const powerLevels = format?.powerLevels ?? [];

  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    // Convert UTC ISO to local datetime-local value
    new Date(session.scheduled_at).toISOString().slice(0, 16)
  );
  const [maxPlayers, setMaxPlayers] = useState(session.max_players);
  const [locationName, setLocationName] = useState(session.location_name ?? "");
  const [powerLevel, setPowerLevel] = useState<number | null>(session.power_level ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await updateSession(session.id, {
        title,
        description,
        scheduled_at: scheduledAt,
        max_players: maxPlayers,
        location_name: locationName,
        power_level: powerLevel,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Session aktualisiert");
        onSaved({ title, description, scheduled_at: scheduledAt, max_players: maxPlayers, location_name: locationName, power_level: powerLevel });
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Session bearbeiten</h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">Titel</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl text-sm"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Beschreibung <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl text-sm min-h-[80px] resize-none"
          maxLength={500}
        />
      </div>

      {/* Date/Time */}
      <div className="space-y-1.5">
        <Label className="text-xs">Datum & Uhrzeit</Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="rounded-xl text-sm"
          min={new Date().toISOString().slice(0, 16)}
        />
      </div>

      {/* Max players */}
      <div className="space-y-1.5">
        <Label className="text-xs">Max. Spieler</Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMaxPlayers((p) => Math.max(session.current_players, (format?.playerCount.min ?? 2), p - 1))}
            disabled={maxPlayers <= Math.max(session.current_players, format?.playerCount.min ?? 2)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all cursor-pointer",
              maxPlayers <= Math.max(session.current_players, format?.playerCount.min ?? 2)
                ? "border-border text-muted-foreground opacity-40 cursor-default"
                : "border-border hover:border-primary hover:text-primary"
            )}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-heading text-3xl font-semibold text-primary w-8 text-center">{maxPlayers}</span>
          <button
            type="button"
            onClick={() => setMaxPlayers((p) => Math.min(format?.playerCount.max ?? 20, p + 1))}
            disabled={maxPlayers >= (format?.playerCount.max ?? 20)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all cursor-pointer",
              maxPlayers >= (format?.playerCount.max ?? 20)
                ? "border-border text-muted-foreground opacity-40 cursor-default"
                : "border-border hover:border-primary hover:text-primary"
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
          {session.current_players > 0 && (
            <span className="text-xs text-muted-foreground">
              (min. {session.current_players} wegen Teilnehmer)
            </span>
          )}
        </div>
      </div>

      {/* Location name */}
      <div className="space-y-1.5">
        <Label className="text-xs">Treffpunkt <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="z.B. Café XY, Spieleladen..."
          className="rounded-xl text-sm"
          maxLength={200}
        />
      </div>

      {/* Power Level */}
      {powerLevels.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Power Level</Label>
          <div className="flex flex-wrap gap-2">
            {powerLevels.map((pl) => (
              <button
                key={pl.level}
                type="button"
                onClick={() => setPowerLevel(powerLevel === pl.level ? null : pl.level)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  powerLevel === pl.level
                    ? "border-current text-white"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
                style={powerLevel === pl.level ? { background: pl.color, borderColor: pl.color } : undefined}
              >
                {pl.level} · {pl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl"
          onClick={onClose}
          disabled={pending}
        >
          Abbrechen
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 rounded-xl"
          onClick={handleSave}
          disabled={pending || title.trim().length < 3 || !scheduledAt}
        >
          {pending ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
