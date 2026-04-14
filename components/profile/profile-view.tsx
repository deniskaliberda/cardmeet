"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, Edit, Shield, Camera, Plus } from "lucide-react";
import { PushToggle } from "@/components/notifications/push-toggle";
import { getTCG } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { ReviewList } from "@/components/review/review-list";
import { FriendList } from "@/components/friends/friend-list";
import { AddFriendSearch } from "@/components/friends/add-friend-search";
import { AlertCard } from "@/components/alerts/alert-card";
import { CreateAlertForm } from "@/components/alerts/create-alert-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { cn } from "@/lib/utils";
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
  friend_count?: number | null;
  is_venue?: boolean | null;
  venue_name?: string | null;
  venue_website?: string | null;
};

const TABS = [
  { id: "overview", label: "📊 Übersicht" },
  { id: "settings", label: "⚙️ Einstellungen" },
  { id: "friends", label: "👥 Freunde" },
  { id: "history", label: "📜 Verlauf" },
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url ?? null
  );
  const router = useRouter();
  const [uploading, startUpload] = useTransition();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5 MB groß sein");
      return;
    }
    startUpload(async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        toast.error("Upload fehlgeschlagen: " + uploadError.message);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (updateError) {
        toast.error(updateError.message);
        return;
      }
      setAvatarUrl(publicUrl + "?t=" + Date.now());
      toast.success("Profilbild aktualisiert");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-[var(--secondary)] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/8 rounded-full translate-x-[30%] -translate-y-[30%]" />
        <div className="flex items-center gap-6 relative">
          {/* Avatar with upload */}
          <div className="relative shrink-0">
            <label
              className="block cursor-pointer"
              title="Profilbild ändern"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
              <Avatar className="h-24 w-24 border-4 border-white/30">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-[var(--secondary)] text-white text-3xl font-semibold">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 backdrop-blur-sm text-white">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-3xl font-semibold text-white tracking-[-0.02em] mb-2">
              {profile.display_name ?? profile.username}
            </h1>
            <div className="flex gap-2.5 flex-wrap mb-3">
              {(profile.avg_rating ?? 0) > 0 && (
                <span className="bg-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-white">
                  👍 {profile.avg_rating} Empfehlungen
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
              <p className="text-white/85 text-sm leading-relaxed line-clamp-2">
                {profile.bio}
              </p>
            )}
          </div>

          <button
            onClick={() => setActiveTab("settings")}
            className="shrink-0 self-start flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            Bearbeiten
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl bg-card shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] overflow-hidden">
        <div className="flex bg-[var(--surface-container-low)] border-b-2 border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all cursor-pointer border-b-[3px] -mb-0.5",
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
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Freund hinzufügen</h4>
                <AddFriendSearch />
              </div>
              <FriendList friends={friends} pendingRequests={pendingRequests} />
            </div>
          )}
          {activeTab === "history" && (
            <HistoryTab sessions={hostedSessions} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  profile,
  reviews,
}: {
  profile: Profile;
  reviews: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2 tracking-wide">
            Sessions
          </div>
          <div className="font-heading text-3xl font-medium text-primary">
            {profile.session_count ?? 0}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2 tracking-wide">
            Empfohlen
          </div>
          <div className="font-heading text-3xl font-medium text-[var(--secondary)]">
            {profile.avg_rating ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            👍 Empfehlungen
          </div>
        </div>
        <div className="rounded-xl bg-[var(--surface-container-low)] p-5 text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2 tracking-wide">
            Freunde
          </div>
          <div className="font-heading text-3xl font-medium text-[var(--accent)]">
            {profile.friend_count ?? 0}
          </div>
        </div>
      </div>

      {/* Favorite TCGs */}
      {(profile.preferred_tcgs ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">🎴 Lieblings-TCGs</h3>
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
        <h3 className="text-sm font-medium mb-3">⭐ Neueste Bewertungen</h3>
        <ReviewList reviews={reviews} />
      </div>
    </div>
  );
}

// ── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({
  profile,
  alerts,
}: {
  profile: Profile;
  alerts: any[];
}) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);

  return (
    <div className="space-y-8">
      {/* Profile editing */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Profil-Einstellungen</h3>
          {!editingProfile && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setEditingProfile(true)}
            >
              <Edit className="h-3 w-3 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>

        {editingProfile ? (
          <ProfileForm
            profile={{
              display_name: profile.display_name ?? null,
              bio: profile.bio ?? null,
              city: profile.city ?? null,
              preferred_tcgs: profile.preferred_tcgs ?? null,
            }}
            onSaved={() => setEditingProfile(false)}
          />
        ) : (
          <div className="rounded-xl bg-[var(--surface-container-low)] p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Anzeigename</span>
              <span className="text-xs font-medium">
                {profile.display_name ?? "–"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Username</span>
              <span className="text-xs font-medium">@{profile.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Stadt</span>
              <span className="text-xs font-medium">{profile.city ?? "–"}</span>
            </div>
            {profile.bio && (
              <div>
                <span className="text-muted-foreground text-xs block mb-1">
                  Bio
                </span>
                <p className="text-xs leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Alerts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">🔔 Dauerhafte Session-Alerts</h3>
          {!showCreateAlert && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs gap-1"
              onClick={() => setShowCreateAlert(true)}
            >
              <Plus className="h-3 w-3" />
              Neu
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Werde automatisch benachrichtigt, sobald eine passende Session
          erstellt wird — ohne manuell suchen zu müssen.
        </p>

        {showCreateAlert && (
          <div className="mb-4">
            <CreateAlertForm onCreated={() => setShowCreateAlert(false)} />
          </div>
        )}

        {alerts.length === 0 && !showCreateAlert ? (
          <button
            onClick={() => setShowCreateAlert(true)}
            className="w-full rounded-xl border-2 border-dashed border-border py-4 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            + Ersten Alert einrichten
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert: any) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Notification settings */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Benachrichtigungen</h3>
        <div className="flex flex-col gap-2">
          <PushToggle userId={profile.id} />
          {[
            {
              label: "Email-Benachrichtigungen",
              sub: "Updates per Email erhalten",
            },
            {
              label: "Session-Reminder",
              sub: "24h vor der Session erinnern",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl bg-[var(--surface-container-low)] px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
              {/* Toggle (visual only) */}
              <div className="h-6 w-11 rounded-full bg-[#006b5c] relative cursor-pointer flex-shrink-0">
                <div className="absolute top-[3px] right-[3px] h-[18px] w-[18px] rounded-full bg-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DSGVO / Datenverwaltung */}
      <div>
        <h3 className="text-sm font-semibold mb-2">📦 Meine Daten</h3>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Gemäß DSGVO Art. 15 & 20 hast du das Recht auf Auskunft und
          Datenportabilität.
        </p>
        <Button size="sm" variant="outline" className="rounded-xl text-xs">
          Daten exportieren
        </Button>
      </div>

      {/* Account deletion */}
      <div className="rounded-xl bg-destructive/5 border-2 border-destructive/20 p-5">
        <h3 className="text-sm font-medium text-destructive mb-2">
          Account löschen
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Dein Account und alle zugehörigen Daten werden unwiderruflich gelöscht.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs border-destructive text-destructive hover:bg-destructive/10"
        >
          Account löschen
        </Button>
      </div>
    </div>
  );
}

// ── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab({ sessions }: { sessions: any[] }) {
  const pastSessions = sessions.filter(
    (s) =>
      new Date(s.scheduled_at) <= new Date() || s.status === "cancelled"
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
            className="flex items-center justify-between rounded-xl bg-[var(--surface-container-low)] p-3 transition-colors hover:bg-[var(--surface-container)]"
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
