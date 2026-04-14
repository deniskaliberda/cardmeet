"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { X } from "lucide-react";
import { getTCG } from "@/lib/config/tcg";
import { cancelLfgPost } from "@/app/(app)/lfg/actions";
import { toast } from "sonner";

type LfgPost = {
  id: string;
  tcg: string;
  format: string | null;
  available_from: string;
  available_to: string;
  location_label: string | null;
};

export function LfgActiveBadge({ posts }: { posts: LfgPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <LfgPostBadge key={post.id} post={post} />
      ))}
    </div>
  );
}

function LfgPostBadge({ post }: { post: LfgPost }) {
  const [pending, startTransition] = useTransition();
  const tcg = getTCG(post.tcg);
  const from = new Date(post.available_from);
  const to = new Date(post.available_to);

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelLfgPost(post.id);
      if ("error" in result) toast.error(result.error);
      else toast.success("LFG abgebrochen");
    });
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm"
      style={{
        borderColor: `${tcg?.color ?? "#666"}40`,
        background: `linear-gradient(135deg, ${tcg?.color ?? "#666"}10, transparent)`,
      }}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: tcg?.color ?? "var(--primary)" }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: tcg?.color ?? "var(--primary)" }}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">
          <span style={{ color: tcg?.color }}>{tcg?.shortName}</span>
          {post.format && <span className="text-muted-foreground"> · {post.format}</span>}
          <span className="text-muted-foreground"> · Suche Mitspieler...</span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {format(from, "EEE d. MMM, HH:mm", { locale: de })} – {format(to, "HH:mm", { locale: de })} Uhr
          {post.location_label && ` · ${post.location_label}`}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
