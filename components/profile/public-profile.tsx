"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, MessageCircle, Star, UserCheck, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getTCG } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { cn } from "@/lib/utils";
import { sendFriendRequest, acceptFriendRequest } from "@/app/(app)/friends/actions";
import { toast } from "sonner";

type Profile = {
  id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  preferred_tcgs?: string[] | null;
  avg_rating?: number | null;
  review_count?: number | null;
  session_count?: number | null;
};

type Session = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  scheduled_at: string;
  max_players: number;
  current_players: number;
  status: string;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
};

type FriendshipInfo = {
  id: string;
  status: "pending" | "accepted" | "blocked";
  isRequester: boolean;
} | null;

export function PublicProfile({
  profile,
  hostedSessions,
  reviews,
  currentUserId,
  friendship: initialFriendship,
}: {
  profile: Profile;
  hostedSessions: Session[];
  reviews: Review[];
  currentUserId?: string | null;
  friendship?: FriendshipInfo;
}) {
  const [friendship, setFriendship] = useState<FriendshipInfo>(initialFriendship ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const displayName = profile.display_name ?? profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const rating = profile.avg_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-6 flex items-start gap-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary text-white text-2xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{displayName}</h1>
              {profile.display_name && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {profile.city && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city}
                </div>
              )}
            </div>

            {/* Friend button — only shown when logged in and viewing someone else */}
            {currentUserId && currentUserId !== profile.id && (
              <div className="shrink-0">
                {!friendship && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const r = await sendFriendRequest(profile.id);
                      if (r?.error) toast.error(r.error);
                      else {
                        toast.success("Freundschaftsanfrage gesendet");
                        setFriendship({ id: "", status: "pending", isRequester: true });
                      }
                    })}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Freund hinzufügen
                  </Button>
                )}
                {friendship?.status === "pending" && friendship.isRequester && (
                  <Button size="sm" variant="outline" disabled className="text-muted-foreground">
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Anfrage gesendet
                  </Button>
                )}
                {friendship?.status === "pending" && !friendship.isRequester && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const r = await acceptFriendRequest(friendship.id);
                      if (r?.error) toast.error(r.error);
                      else {
                        toast.success("Freundschaft angenommen!");
                        setFriendship({ ...friendship, status: "accepted" });
                      }
                    })}
                  >
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Anfrage annehmen
                  </Button>
                )}
                {friendship?.status === "accepted" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled className="text-green-600 border-green-200">
                      <UserCheck className="h-4 w-4 mr-1.5" />
                      Befreundet
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`?dm=${profile.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1.5" />
                      Nachricht
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sessions" value={profile.session_count ?? 0} />
        <StatCard
          label="Bewertung"
          value={
            <div className="flex items-center gap-1">
              <span className="font-semibold">{rating > 0 ? rating.toFixed(1) : "–"}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5"
                    fill={i <= fullStars ? "#F59E0B" : i === fullStars + 1 && hasHalf ? "#F59E0B" : "none"}
                    stroke="#F59E0B"
                    style={{ opacity: i <= fullStars || (i === fullStars + 1 && hasHalf) ? 1 : 0.3 }}
                  />
                ))}
              </div>
            </div>
          }
        />
        <StatCard label="Bewertungen" value={profile.review_count ?? 0} />
      </div>

      {/* Preferred TCGs */}
      {(profile.preferred_tcgs?.length ?? 0) > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 className="text-sm font-semibold mb-3">Gespielte TCGs</h2>
          <div className="flex flex-wrap gap-2">
            {profile.preferred_tcgs!.map((tcgId) => {
              const tcg = getTCG(tcgId);
              if (!tcg) return null;
              return (
                <span
                  key={tcgId}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: `${tcg.color}18`, color: tcg.color, border: `1px solid ${tcg.color}30` }}
                >
                  <TCGIcon tcgId={tcgId} className="h-3 w-3" color={tcg.color} />
                  {tcg.shortName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {hostedSessions.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 className="text-sm font-semibold mb-3">Bevorstehende Sessions</h2>
          <div className="flex flex-col gap-2">
            {hostedSessions.map((s) => {
              const tcg = getTCG(s.tcg);
              const free = s.max_players - s.current_players;
              return (
                <a
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border-2 border-border bg-card p-3 hover:border-primary transition-colors"
                >
                  <div className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ background: tcg?.color ? `${tcg.color}22` : undefined }}>
                    <TCGIcon tcgId={s.tcg} className="h-4 w-4" color={tcg?.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.scheduled_at), "EEE, d. MMM · HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                  <div className={cn(
                    "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                    free === 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                  )}>
                    <Users className="h-3 w-3 inline mr-1" />
                    {free === 0 ? "Voll" : `${free} frei`}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 className="text-sm font-semibold mb-3">Bewertungen ({reviews.length})</h2>
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={r.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(r.profiles?.username ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium">{r.profiles?.username ?? "Anonym"}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className="h-3 w-3" fill={i <= r.rating ? "#F59E0B" : "none"} stroke="#F59E0B"
                          style={{ opacity: i <= r.rating ? 1 : 0.3 }} />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {format(new Date(r.created_at), "d. MMM yyyy", { locale: de })}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length === 0 && hostedSessions.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
          Noch keine öffentlichen Aktivitäten
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 text-center"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
