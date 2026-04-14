"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LfgQuickForm } from "@/components/lfg/lfg-quick-form";

type Props = {
  preferredTcgs?: string[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  activeLfgCount?: number;
};

export function LfgButton({
  preferredTcgs,
  userLat,
  userLng,
  userCity,
  activeLfgCount = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasActive = activeLfgCount > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
          className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98]"
          style={{
            borderColor: hasActive
              ? "oklch(0.75 0.18 160)"
              : "oklch(0.62 0.22 264 / 50%)",
            background: hasActive
              ? "linear-gradient(135deg, oklch(0.75 0.18 160 / 15%), oklch(0.62 0.22 264 / 10%))"
              : "linear-gradient(135deg, oklch(0.62 0.22 264 / 15%), oklch(0.55 0.20 285 / 10%))",
            boxShadow: hasActive
              ? "0 4px 24px oklch(0.75 0.18 160 / 20%)"
              : "0 4px 24px oklch(0.62 0.22 264 / 15%)",
          }}
        >
          {/* Animated glow */}
          <div
            className="absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: hasActive
                ? "oklch(0.75 0.18 160 / 20%)"
                : "oklch(0.62 0.22 264 / 20%)",
            }}
          />

          <div className="relative flex items-center gap-4">
            {/* Icon */}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: hasActive
                  ? "linear-gradient(135deg, oklch(0.75 0.18 160), oklch(0.65 0.2 180))"
                  : "linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.55 0.20 285))",
                boxShadow: hasActive
                  ? "0 2px 12px oklch(0.75 0.18 160 / 30%)"
                  : "0 2px 12px oklch(0.62 0.22 264 / 30%)",
              }}
            >
              <Crosshair className="h-6 w-6 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">LFG</span>
                {hasActive && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasActive
                  ? `${activeLfgCount} aktive${activeLfgCount > 1 ? "" : ""} Suche${activeLfgCount > 1 ? "n" : ""} — tippe zum Verwalten`
                  : "Spieler in deiner Nähe finden"}
              </p>
            </div>

            {/* Arrow hint */}
            <div className="text-muted-foreground transition-transform group-hover:translate-x-1">
              →
            </div>
          </div>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Crosshair className="h-5 w-5 text-primary" />
            Looking for Group
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 pb-6">
          <LfgQuickForm
            preferredTcgs={preferredTcgs}
            userLat={userLat}
            userLng={userLng}
            userCity={userCity}
            onClose={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
