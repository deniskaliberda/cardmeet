import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp } from "lucide-react";

type Review = {
  id: string;
  recommended: boolean;
  tags: string[];
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const positive = reviews.filter((r) => r.recommended);

  if (positive.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Noch keine Bewertungen
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {positive.map((review) => (
        <div
          key={review.id}
          className="rounded-xl bg-[var(--surface-container-low)] p-4"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-white text-xs font-medium">
                  {(review.profiles?.username ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">
                  {review.profiles?.username ?? "Unbekannt"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(review.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#006b5c]">
              <ThumbsUp className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs font-semibold">Empfohlen</span>
            </div>
          </div>

          {review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {review.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#006b5c]/30 bg-[#006b5c]/8 px-2.5 py-0.5 text-[11px] font-medium text-[#006b5c]"
                >
                  ✓ {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Wochen`;
}
