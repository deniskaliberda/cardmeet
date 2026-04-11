"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/app/(app)/reviews/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReviewForm({
  sessionId,
  revieweeId,
  revieweeName,
}: {
  sessionId: string;
  revieweeId: string;
  revieweeName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  function handleSubmit() {
    if (rating === 0) {
      toast.error("Bitte waehle eine Bewertung");
      return;
    }
    startTransition(async () => {
      const result = await submitReview(
        sessionId,
        revieweeId,
        rating,
        comment || null
      );
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Bewertung fuer ${revieweeName} abgeschickt`);
        setSubmitted(true);
        router.refresh();
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-[10px] bg-[#006b5c]/10 border-2 border-[#006b5c] p-3 text-center">
        <div className="text-xs font-medium text-[#006b5c]">
          ✓ Bewertung abgeschickt
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-amber-500/10 border-2 border-amber-500 p-3.5 flex flex-col gap-2.5">
      <div className="text-xs font-medium">⭐ {revieweeName} bewerten</div>

      {/* Star selector */}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                (hoveredRating || rating) >= star
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        placeholder="Kommentar (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        className="w-full rounded-[10px] bg-[var(--surface-container-low)] p-2.5 text-xs text-foreground placeholder:text-muted-foreground resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <Button
        size="sm"
        className="rounded-xl text-xs"
        onClick={handleSubmit}
        disabled={pending || rating === 0}
      >
        {pending ? "Wird gesendet..." : "Bewertung abschicken"}
      </Button>
    </div>
  );
}
