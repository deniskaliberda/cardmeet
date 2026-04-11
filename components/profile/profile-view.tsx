"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, Edit, Shield } from "lucide-react";
import { getTCG } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { ReviewList } from "@/components/review/review-list";
import { FriendList } from "@/components/friends/friend-list";
import { AlertCard } from "@/components/alerts/alert-card";
import { cn } from "@/lib/utils";

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
  friend_count?: number | null;
};

const TABS = [
  { id: "overview", label: "Uebersicht" },
  { id: "settings", label: "Einstellungen" },
  { id: "friends", label: "Freunde" },
  { id: "history", label: "Verlauf" },
] as const;

export function ProfileView({
  profile,
  hostedSessions,
  reviews,
  friends,
  pendingRequests,
  alerts,
}: {
  profile: Profile;
  hostedSessions: any[];
  reviews: any[];
  friends: any[];
  pendingRequests: any[];
  alerts: any[];
}) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-[var(--secondary)] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/8 rounded-full translate-x-[30%] -translate-y-[30%]" />
        <div className="flex items-center gap-6 relative">
          <Avatar className="h-24 w-24 border-4 border-white/30 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary to-[var(--secondary)] text-white text-3xl font-semibold">
              {profile.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-semibold text-white tracking-[-0.02em] mb-2">
              {profile.display_name ?? profile.username}
            </h1>
            <div className="flex gap-3 flex-wrap mb-3">
              {profile.avg_rating != null && (
                <span className="bg-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-white">
                  ⭐ {profile.avg_rating} Rating
                </span>
              )}
              <span className="bg-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-white">
                🎮 {profile.session_count ?? 0} Sessions
              </span>
              <span className="bg-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-white">
                👥 {profile.friend_count ?? 0} Freunde
              </span>
              <span className="bg-[#006b5c]/35 rounded-full px-3.5 py-1 text-xs font-semibold text-white">
                <Shield className="inline h-3 w-3 mr-1" />
                Verified
              </span>
            </div>
            {profile.bio && (
              <p className="text-white/85 text-sm leading-relaxed max-w-xl">
                {profile.bio}
              </p>
            )}
          </div>
          <Link href="/profile/edit" className="shrink-0 self-start">
            <Button
              size="sm"
              className="rounded-xl bg-white/20 text-white hover:bg-white/30 border-0"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Bearbeiten
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl bg-card shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] overflow-hidden">
        <div className="flex bg-[var(--surface-container-low)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all cursor-pointer border-b-3",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <OverviewTab profile={profile} reviews={reviews} />
          )}
          {activeTab === "settings" && (
            <SettingsTab profile={profile} alerts={alerts} />
          )}
          {activeTab === "friends" && (
            <FriendList friends={friends} pendingRequests={pendingRequests} />
          )}
          {activeTab === "history" && (
            <HistoryTab sessions={hostedSessions} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ profile, reviews }: { profile: Profile; reviews: any[] }) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">Sessions</div>
          <div className="font-heading text-3xl font-medium text-primary">{profile.session_count ?? 0}</div>
        </div>
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">Ø Rating</div>
          <div className="font-heading text-3xl font-medium text-[var(--secondary)]">{profile.avg_rating ?? "–"}</div>
          <div className="text-xs text-muted-foreground mt-1">{profile.review_count ?? 0} Bewertungen</div>
        </div>
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">Freunde</div>
          <div className="font-heading text-3xl font-medium text-[var(--accent)]">{profile.friend_count ?? 0}</div>
        </div>
      </div>

      {/* Favorite TCGs */}
      {(profile.preferred_tcgs ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Lieblings-TCGs</h3>
          <div className="flex gap-2.5 flex-wrap">
            {(profile.preferred_tcgs ?? []).map((tcgId: string) => {
              const tcg = getTCG(tcgId);
              return (
                <span
                  key={tcgId}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: tcg?.color ? `${tcg.color}15` : undefined,
                    color: tcg?.color,
                    border: tcg?.color ? `1px solid ${tcg.color}30` : undefined,
                  }}
                >
                  <TCGIcon tcgId={tcgId} className="h-3 w-3" color={tcg?.color} />
                  {tcg?.name ?? tcgId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      <div>
        <h3 className="text-sm font-medium mb-3">Neueste Bewertungen</h3>
        <ReviewList reviews={reviews} />
      </div>
    </div>
  );
}

function SettingsTab({ profile, alerts }: { profile: Profile; alerts: any[] }) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Profil-Einstellungen werden ueber{" "}
          <Link href="/profile/edit" className="text-primary underline">
            Bearbeiten
          </Link>{" "}
          geaendert.
        </p>
      </div>

      {/* Session Alerts */}
      <div id="alerts">
        <h3 className="text-sm font-medium mb-2">Dauerhafte Session-Alerts</h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Richte einen dauerhaften Alert ein. Sobald jemand eine Session erstellt,
          die deinen Kriterien entspricht, bekommst du eine Benachrichtigung.
        </p>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Keine Alerts eingerichtet
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert: any) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Data Export */}
      <div>
        <h3 className="text-sm font-medium mb-2">Datenexport</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Exportiere all deine Daten als JSON-Datei.
        </p>
        <Button size="sm" variant="outline" className="rounded-xl text-xs">
          Daten exportieren
        </Button>
      </div>

      {/* Delete Account */}
      <div className="rounded-xl bg-destructive/5 border-2 border-destructive/20 p-5">
        <h3 className="text-sm font-medium text-destructive mb-2">
          Account loeschen
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Dein Account und alle zugehoerigen Daten werden unwiderruflich geloescht.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs border-destructive text-destructive hover:bg-destructive/10"
        >
          Account loeschen
        </Button>
      </div>
    </div>
  );
}

function HistoryTab({ sessions }: { sessions: any[] }) {
  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduled_at) <= new Date() || s.status === "cancelled"
  );

  if (pastSessions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        Noch keine vergangenen Sessions
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {pastSessions.map((s) => {
        const tcg = getTCG(s.tcg);
        return (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="flex items-center justify-between rounded-xl bg-[var(--surface-container-low)] p-3 tonal-transition hover:bg-[var(--surface-container)]"
          >
            <div className="flex items-center gap-3">
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: tcg?.color
                    ? `linear-gradient(135deg, ${tcg.color}, ${tcg.color}88)`
                    : undefined,
                }}
              >
                <TCGIcon tcgId={s.tcg} className="h-4 w-4 text-white" color="white" />
              </div>
              <div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(s.scheduled_at).toLocaleDateString("de-DE")}
                  {" · "}
                  {s.current_players}/{s.max_players} Spieler
                </div>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                s.status === "cancelled"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-[#006b5c]/10 text-[#006b5c]"
              )}
            >
              {s.status === "cancelled" ? "Abgesagt" : "Abgeschlossen"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
