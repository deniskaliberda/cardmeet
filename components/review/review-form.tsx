"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/app/(app)/reviews/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Kudos canon — kept in sync with the design system Reviews flow
// (.tmp/design-bundle/.../README.md "Kudos-Tags").
export const KUDOS_TAGS = [
  "Fair",
  "Pünktlich",
  "Geduldig erklärt",
  "Lustig",
  "Gutes Deck",
  "Saubere Karten",
  "Chill bei Regelfragen",
  "Bringt Snacks",
] as const;

export function ReviewForm({
  sessionId,
  revieweeId,
  revieweeName,
}: {
  sessionId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const [thumbsUp, setThumbsUp] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitReview(sessionId, revieweeId, selectedTags);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Bewertung für ${revieweeName} abgeschickt`);
        setSubmitted(true);
      }
    });
  }

  const kudosBg = "color-mix(in oklch, var(--kudos) 12%, transparent)";
  const kudosBorder = "color-mix(in oklch, var(--kudos) 35%, transparent)";

  if (submitted) {
    return (
      <div
        className="rounded-[10px] border-2 p-3 text-center"
        style={{ background: kudosBg, borderColor: "var(--kudos)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--kudos)" }}>
          👍 Bewertung abgeschickt
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-[var(--surface-container-low)] border-2 border-border p-3.5 flex flex-col gap-3">
      <div className="text-xs font-medium text-muted-foreground">
        {revieweeName} bewerten
      </div>

      {/* Thumbs up / Skip */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setThumbsUp(true)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all cursor-pointer",
            thumbsUp
              ? "bg-card"
              : "border-border bg-card text-muted-foreground"
          )}
          style={
            thumbsUp
              ? { borderColor: "var(--kudos)", background: kudosBg, color: "var(--kudos)" }
              : undefined
          }
        >
          <ThumbsUp className={cn("h-4 w-4", thumbsUp && "fill-current")} />
          Empfehle ich
        </button>
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="flex items-center justify-center rounded-xl border-2 border-border bg-card px-4 text-xs text-muted-foreground hover:bg-[var(--surface-container)] transition-colors cursor-pointer"
        >
          Überspringen
        </button>
      </div>

      {/* Kudos tags — only shown after thumbs up */}
      {thumbsUp && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {KUDOS_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                    !active && "border-border text-muted-foreground"
                  )}
                  style={
                    active
                      ? { borderColor: kudosBorder, background: kudosBg, color: "var(--kudos)" }
                      : undefined
                  }
                >
                  {active ? "✓ " : ""}
                  {tag}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            className="rounded-xl text-xs"
            style={{ background: "var(--kudos)", color: "#fff" }}
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? "Wird gesendet..." : "Bewertung abschicken"}
          </Button>
        </>
      )}
    </div>
  );
}
