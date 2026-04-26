"use client";

import { useState } from "react";
import { Crosshair, Clock, Users, Store, Swords, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LfgQuickForm } from "@/components/lfg/lfg-quick-form";

type Props = {
  preferredTcgs?: string[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  activeLfgCount?: number;
};

const STEPS = [
  { icon: Clock, label: "Du hast Zeit", sub: "Sag wann & wo" },
  { icon: Users, label: "Match gefunden", sub: "Jemand in deiner Nähe auch" },
  { icon: Store, label: "Treffpunkt", sub: "Im lokalen TCG-Shop" },
  { icon: Swords, label: "Spielen!", sub: "Session startet automatisch" },
];

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
      {/* LFG Hero — mockup signature: blue→violet→pink gradient + purple glow */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{
          borderColor: "rgba(91, 61, 255, 0.35)",
          background:
            "linear-gradient(135deg, rgba(0,102,255,0.14), rgba(91,61,255,0.10) 55%, rgba(255,77,138,0.08))",
          boxShadow: "var(--shadow-purple-md)",
        }}
      >
        {/* Top: Split layout — LFG button left, explanation right */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-stretch gap-0 text-left cursor-pointer transition-all active:scale-[0.99]"
        >
          {/* Left: LFG brand block — mockup gradient + 3-color tint */}
          <div
            className="flex shrink-0 flex-col items-center justify-center gap-2 px-6 py-6 sm:px-8"
            style={{
              background: hasActive
                ? "linear-gradient(180deg, rgba(0,168,120,0.28), rgba(91,61,255,0.18))"
                : "linear-gradient(180deg, rgba(0,102,255,0.30), rgba(91,61,255,0.22), rgba(255,77,138,0.14))",
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl"
              style={{
                background: hasActive
                  ? "linear-gradient(135deg, oklch(0.75 0.18 160), oklch(0.65 0.2 180))"
                  : "var(--gradient-lfg)",
                boxShadow: hasActive
                  ? "0 6px 18px oklch(0.75 0.18 160 / 45%)"
                  : "var(--shadow-purple-lg)",
              }}
            >
              <Crosshair className="h-7 w-7 text-white" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight text-white">LFG</span>
            {hasActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            )}
          </div>

          {/* Right: Explanation */}
          <div className="flex flex-1 flex-col justify-center gap-2 py-5 pr-4 pl-3">
            <div>
              <span
                className="mono-eyebrow block"
                style={{ color: "#FF4D8A", marginBottom: 4 }}
              >
                Looking for Group
              </span>
              <h3 className="font-heading text-lg font-bold tracking-tight">
                Mitspieler finden
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {hasActive
                  ? `${activeLfgCount} aktive Suche${activeLfgCount > 1 ? "n" : ""} — tippe zum Verwalten`
                  : "Sag uns wann und wo — wir matchen dich automatisch."}
              </p>
            </div>
            <div
              className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold text-white"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "var(--shadow-purple-sm)",
              }}
            >
              {hasActive ? "Suchen verwalten" : "Jetzt suchen"}
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>

        {/* Bottom: Process visualization */}
        <div
          className="border-t px-4 py-4 sm:px-6"
          style={{ borderColor: "rgba(91, 61, 255, 0.18)" }}
        >
          <p className="mono-eyebrow mb-3" style={{ color: "var(--muted-foreground)" }}>
            So funktioniert&apos;s
          </p>
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative flex flex-col items-center text-center">
                  <div
                    className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0,102,255,0.18), rgba(91,61,255,0.14))",
                    }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: "#7B5DFF" }} />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{step.label}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{step.sub}</span>
                  {i < STEPS.length - 1 && (
                    <div className="absolute right-0 top-4 hidden translate-x-1/2 text-xs text-primary/40 sm:block">
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sheet with LFG Form */}
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
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
