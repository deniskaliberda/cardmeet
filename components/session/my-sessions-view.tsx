"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock, MapPin, Share2, Users, Star, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SessionChat } from "@/components/session/session-chat";
import { ParticipantList } from "@/components/session/participant-list";
import { getTCG, getPowerLevel } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";
import { leaveSession, cancelSession, pauseSession, inviteToSession } from "@/app/(app)/sessions/actions";
import { EditSessionForm } from "@/components/session/edit-session-form";
import { FriendInviteGrid } from "@/components/session/friend-invite-grid";
import { ReviewForm } from "@/components/review/review-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Session = {
  id: string;
  title: string;
  description?: string | null;
  tcg: string;
  format: string;
  power_level?: number | null;
  max_players: number;
  current_players: number;
  status: string;
  city?: string | null;
  location_name?: string | null;
  scheduled_at: string;
  host_id: string;
  entry_fee_cents?: number | null;
  recurrence?: string | null;
  profiles?: { id?: string; username: string; avatar_url: string | null } | null;
};

type Participant = {
  user_id: string;
  status: string;
  profiles: { id?: string; username: string; avatar_url: string | null } | null;
};

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

type Friend = { user_id: string; username: string; avatar_url: string | null; avg_rating: null };

export function MySessionsView({
  upcoming,
  past,
  initialSessionId,
  initialParticipants,
  initialMessages,
  currentUserId,
  friends = [],
}: {
  upcoming: Session[];
  past: Session[];
  initialSessionId: string | null;
  initialParticipants: Participant[];
  initialMessages: Message[];
  currentUserId: string;
  friends?: Friend[];
}) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(initialSessionId);
  const [chatKey, setChatKey] = useState<string>(initialSessionId ?? "");
  const [participants, setParticipants] = useState(initialParticipants);
  const [messages, setMessages] = useState(initialMessages);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSelected, setInviteSelected] = useState<string[]>([]);

  const sessions = activeTab === "upcoming" ? upcoming : past;
  const selected = [...upcoming, ...past].find((s) => s.id === selectedId) ?? null;
  const isHost = selected?.host_id === currentUserId;
  const isParticipant = participants.some((p) => p.user_id === currentUserId);
  const isPast = selected ? new Date(selected.scheduled_at) <= new Date() : false;

  async function selectSession(id: string) {
    setSelectedId(id);
    setParticipants([]);
    setMessages([]);
    // Fetch participants + messages client-side
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const [{ data: parts }, { data: msgs }] = await Promise.all([
      supabase
        .from("session_participants")
        .select("user_id, status, profiles(id, username, avatar_url)")
        .eq("session_id", id)
        .eq("status", "joined"),
      supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
        .eq("session_id", id)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);
    setParticipants((parts as any) ?? []);
    setMessages((msgs as any) ?? []);
    // Update key AFTER messages are ready — so SessionChat mounts with correct data
    setChatKey(id);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 h-[calc(100vh-120px)] min-h-[600px]">
      {/* LEFT: Session Sidebar */}
      <div className="flex flex-col gap-2.5 overflow-hidden">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">
            Meine Sessions
          </h2>
          <p className="text-xs text-muted-foreground">
            {upcoming.length} bevorstehend · {past.length} vergangen
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 rounded-[10px] bg-card p-[3px] shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)]">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
              activeTab === "upcoming"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Bevorstehend ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
              activeTab === "past"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Vergangen ({past.length})
          </button>
        </div>

        {/* Session List */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Keine Sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SidebarItem
                key={session.id}
                session={session}
                isSelected={selectedId === session.id}
                currentUserId={currentUserId}
                onClick={() => selectSession(session.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Detail Area */}
      {selected ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_190px_1fr] gap-3.5 h-full overflow-hidden">
          {/* Col 1: Session Info */}
          <SessionDetailColumn
            session={selected}
            isHost={isHost}
            isParticipant={isParticipant}
            isPast={isPast}
            currentUserId={currentUserId}
            participants={participants}
            friends={friends}
            inviteOpen={inviteOpen}
            inviteSelected={inviteSelected}
            onInviteOpen={() => setInviteOpen((v) => !v)}
            onInviteChange={setInviteSelected}
            onSessionUpdated={() => {}}
          />

          {/* Col 2: Participants */}
          <div className="rounded-2xl bg-card p-4 shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] flex flex-col overflow-y-auto">
            <ParticipantList
              participants={participants}
              hostId={selected.host_id}
              maxPlayers={selected.max_players}
              currentUserId={currentUserId}
              isHost={isHost}
              sessionId={selected.id}
            />
          </div>

          {/* Col 3: Chat */}
          <div className="rounded-2xl bg-card p-4 shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] flex flex-col overflow-hidden">
            <div className="text-sm font-medium mb-3">
              Session Chat
              {isPast && (
                <span className="text-xs text-muted-foreground font-normal ml-1.5">
                  (abgeschlossen)
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <SessionChat
                key={chatKey}
                sessionId={selected.id}
                currentUserId={currentUserId}
                initialMessages={messages}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Waehle eine Session aus der Liste
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  session,
  isSelected,
  currentUserId,
  onClick,
}: {
  session: Session;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const tcg = getTCG(session.tcg);
  const isHost = session.host_id === currentUserId;
  const scheduledDate = new Date(session.scheduled_at);
  const isToday = new Date().toDateString() === scheduledDate.toDateString();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] p-2.5 text-left transition-all cursor-pointer",
        isSelected
          ? "bg-primary/8 border-2 border-primary"
          : "bg-card border-2 border-transparent hover:bg-[var(--surface-container-low)]",
        "shadow-[0_1px_3px_oklch(0.224_0.018_275.1/5%)]"
      )}
    >
      {/* TCG Icon */}
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: tcg?.color
            ? `linear-gradient(135deg, ${tcg.color}, ${tcg.color}88)`
            : undefined,
        }}
      >
        <TCGIcon tcgId={session.tcg} className="h-4 w-4 text-white" color="white" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{session.title}</div>
        <div className="text-[11px] text-muted-foreground">
          {format(scheduledDate, "EEE d. MMM HH:mm", { locale: de })} ·{" "}
          {session.city ?? session.location_name ?? ""}
        </div>
      </div>

      {/* Status + count */}
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "text-[10px] font-medium whitespace-nowrap",
            isToday && "text-primary",
            isHost && "text-[#006b5c]",
            !isToday && !isHost && "text-primary"
          )}
        >
          {isToday ? "● Heute" : isHost ? "🏠 Host" : "Angemeldet"}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {session.current_players}/{session.max_players}
        </div>
      </div>
    </button>
  );
}

function SessionDetailColumn({
  session,
  isHost,
  isParticipant,
  isPast,
  currentUserId,
  participants,
  friends,
  inviteOpen,
  inviteSelected,
  onInviteOpen,
  onInviteChange,
  onSessionUpdated,
}: {
  session: Session;
  isHost: boolean;
  isParticipant: boolean;
  isPast: boolean;
  currentUserId: string;
  participants: Participant[];
  friends: Friend[];
  inviteOpen: boolean;
  inviteSelected: string[];
  onInviteOpen: () => void;
  onInviteChange: (ids: string[]) => void;
  onSessionUpdated: (updated: Partial<Session>) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [invitePending, startInviteTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const tcg = getTCG(session.tcg);
  const powerLevel =
    session.power_level != null
      ? getPowerLevel(session.tcg, session.format, session.power_level)
      : undefined;
  const scheduledDate = new Date(session.scheduled_at);

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveSession(session.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Session verlassen");
        router.refresh();
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSession(session.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Session gelöscht");
        router.push("/my-sessions");
      }
    });
  }

  function handleInvite() {
    startInviteTransition(async () => {
      const result = await inviteToSession(session.id, inviteSelected);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${inviteSelected.length} Freund${inviteSelected.length !== 1 ? "e" : ""} eingeladen`);
        onInviteChange([]);
        onInviteOpen();
      }
    });
  }

  function handlePause() {
    startTransition(async () => {
      const result = await pauseSession(session.id, session.status);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          session.status === "paused" ? "Session fortgesetzt" : "Session pausiert"
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] flex flex-col gap-3.5 overflow-y-auto">
      {/* Badge + Title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: tcg?.color ? `${tcg.color}15` : undefined,
              color: tcg?.color,
              border: tcg?.color ? `1px solid ${tcg.color}30` : undefined,
            }}
          >
            <TCGIcon tcgId={session.tcg} className="h-3 w-3" color={tcg?.color} />
            {tcg?.shortName}: {session.format}
          </span>
          {isHost && (
            <span className="rounded-lg bg-[#006b5c]/15 text-[#006b5c] px-2.5 py-0.5 text-[11px] font-medium">
              🏠 Du bist Host
            </span>
          )}
          {isPast && (
            <span className="rounded-lg bg-[#006b5c]/15 text-[#006b5c] px-2.5 py-0.5 text-[11px] font-medium">
              ✓ Abgeschlossen
            </span>
          )}
          {session.recurrence && session.recurrence !== "none" && (
            <span className="rounded-lg bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
              🔁 {{ weekly: "Wöchentlich", biweekly: "2-wöchentlich", monthly: "Monatlich" }[session.recurrence] ?? ""}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-heading text-xl font-medium tracking-[-0.02em] leading-tight">
            {session.title}
          </h3>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/sessions/${session.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Link kopiert");
            }}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            <Share2 className="h-3 w-3" /> Teilen
          </button>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(scheduledDate, "EEEE, d. MMMM · HH:mm", { locale: de })} Uhr
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Ca. 3–4 Stunden</span>
          </div>
        </div>
      </div>

      {/* Enrolled box */}
      {(isParticipant || isHost) && !isPast && (
        <div className="rounded-[10px] bg-[#006b5c]/10 border-2 border-[#006b5c] p-3">
          <div className="text-xs font-medium mb-1">
            ✅ {isHost ? "Du bist der Host" : "Du bist angemeldet"}
          </div>
          {(session.location_name || session.city) && (
            <>
              <div className="text-xs font-medium text-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.location_name ?? session.city}
              </div>
            </>
          )}
        </div>
      )}

      {/* Description */}
      {session.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {session.description}
        </p>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[var(--surface-container-low)] p-2 text-xs">
          <div className="text-muted-foreground">Power Level</div>
          <div className="font-medium mt-0.5">
            {powerLevel ? `${powerLevel.level}/10` : "–"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-container-low)] p-2 text-xs">
          <div className="text-muted-foreground">Kosten</div>
          <div className="font-medium mt-0.5">
            {session.entry_fee_cents && session.entry_fee_cents > 0
              ? `${(session.entry_fee_cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`
              : "Gratis"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-container-low)] p-2 text-xs">
          <div className="text-muted-foreground">Spieler</div>
          <div className="font-medium mt-0.5">
            {session.current_players} / {session.max_players}
          </div>
        </div>
      </div>

      {/* Edit form (inline) */}
      {editing && (
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <EditSessionForm
            session={session}
            onClose={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false);
              onSessionUpdated(updated);
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-1.5 mt-auto">
        {isHost && !isPast && (
          <>
            <Button
              size="sm"
              className="w-full rounded-xl text-xs"
              disabled={pending}
              onClick={() => setEditing((v) => !v)}
            >
              ✏️ {editing ? "Abbrechen" : "Bearbeiten"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl text-xs"
              onClick={onInviteOpen}
              disabled={pending}
            >
              👥 Freunde einladen
            </Button>
            {inviteOpen && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
                <FriendInviteGrid
                  friends={friends}
                  selected={inviteSelected}
                  onSelectionChange={onInviteChange}
                />
                {inviteSelected.length > 0 && (
                  <Button
                    size="sm"
                    className="w-full rounded-xl text-xs"
                    onClick={handleInvite}
                    disabled={invitePending}
                  >
                    {invitePending ? "Wird gesendet..." : `${inviteSelected.length} einladen`}
                  </Button>
                )}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl text-xs"
              onClick={handlePause}
              disabled={pending}
            >
              {session.status === "paused" ? "▶ Fortsetzen" : "⏸ Pausieren"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs border-destructive text-destructive hover:bg-destructive/10"
                    disabled={pending}
                  />
                }
              >
                🗑️ Absagen
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Session absagen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Alle Teilnehmer werden über die Absage informiert.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleCancel}
                  >
                    Ja, absagen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {isParticipant && !isHost && !isPast && (
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl text-xs border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleLeave}
            disabled={pending}
          >
            Session verlassen
          </Button>
        )}

        {/* Review form for past sessions */}
        {isPast &&
          participants
            .filter((p) => p.user_id !== currentUserId)
            .map((p) => (
              <ReviewForm
                key={p.user_id}
                sessionId={session.id}
                revieweeId={p.user_id}
                revieweeName={p.profiles?.username ?? "Unbekannt"}
              />
            ))}
      </div>
    </div>
  );
}
