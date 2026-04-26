"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickStats } from "@/components/home/hero-actions";
import { LfgButton } from "@/components/home/lfg-button";
import { LfgActiveBadge } from "@/components/lfg/lfg-active-badge";
import { UpcomingSessions } from "@/components/home/upcoming-sessions";
import { FriendsPlaying } from "@/components/home/friends-playing";
import { TcgShortcuts } from "@/components/home/tcg-shortcuts";
import { MySessionsView } from "@/components/session/my-sessions-view";
import { ActiveAlertsBar } from "@/components/alerts/active-alerts-bar";

type Props = {
  username: string;
  greeting: string;
  openCount: number;
  allUpcoming: any[];
  nearbyMapped: any[];
  joinedSessionIds: Set<string>;
  // LFG data
  activeLfgPosts?: any[];
  preferredTcgs?: string[];
  userLat?: number;
  userLng?: number;
  userCity?: string;
  friendsSessions?: any[];
  // Meine Sessions data
  mySessionsUpcoming: any[];
  mySessionsPast: any[];
  initialSessionId: string | null;
  initialParticipants: any[];
  initialMessages: any[];
  currentUserId: string;
  friends: any[];
  sessionAlerts?: {
    id: string;
    tcg: string;
    format: string | null;
    max_radius_km: number;
    days_of_week: number[];
    status: string;
  }[];
};

const TABS = [
  { id: "overview", label: "Übersicht" },
  { id: "my-sessions", label: "Meine Sessions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HomeView({
  username,
  greeting,
  openCount,
  allUpcoming,
  nearbyMapped,
  joinedSessionIds,
  activeLfgPosts = [],
  preferredTcgs,
  userLat,
  userLng,
  userCity,
  friendsSessions = [],
  mySessionsUpcoming,
  mySessionsPast,
  initialSessionId,
  initialParticipants,
  initialMessages,
  currentUserId,
  friends,
  sessionAlerts = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-5">
      {/* Header + Tabs */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.02em]">
            {greeting}, {username} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Was steht heute an?</p>
          <ActiveAlertsBar alerts={sessionAlerts} />
        </div>

        <div className="flex gap-0 rounded-[10px] bg-card p-[3px] shadow-[0_2px_8px_oklch(0.224_0.018_275.1/8%),0_0_0_1px_oklch(0.829_0.026_275.8/10%)] shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6 max-w-2xl">
          {/* 1. LFG Hero — the main feature */}
          <LfgButton
            preferredTcgs={preferredTcgs}
            userLat={userLat}
            userLng={userLng}
            userCity={userCity}
            activeLfgCount={activeLfgPosts.length}
          />

          {/* 2. Active LFG posts */}
          <LfgActiveBadge posts={activeLfgPosts} />

          {/* 3. Quick Stats — sessions, nearby, shops */}
          <QuickStats
            openSessionCount={openCount}
            nearbyCount={nearbyMapped.length}
            shopCount={9}
          />

          {/* 4. Deine Sessions (Upcoming) */}
          <UpcomingSessions sessions={allUpcoming} />

          {/* 5. Empty-state onboarding — only when the user has nothing in flight yet */}
          {allUpcoming.length === 0 && activeLfgPosts.length === 0 && (
            <DashboardOnboardingCards />
          )}

          {/* 6. TCG Shortcuts */}
          <TcgShortcuts />

          {/* 7. Friends playing */}
          <FriendsPlaying sessions={friendsSessions} />
        </div>
      )}

      {/* Meine Sessions tab */}
      {activeTab === "my-sessions" && (
        <MySessionsView
          upcoming={mySessionsUpcoming}
          past={mySessionsPast}
          initialSessionId={initialSessionId}
          initialParticipants={initialParticipants}
          initialMessages={initialMessages}
          currentUserId={currentUserId}
          friends={friends}
        />
      )}
    </div>
  );
}

// ── Empty-state onboarding cards ──────────────────────────────────────
// Compact 3-step explainer for users who have nothing in flight yet.
// Mirrors the landing-page "So funktioniert's" treatment from the design
// bundle (mockup gradient + step number + glow on accent border).
const ONBOARD_STEPS = [
  {
    step: "01",
    icon: "🗺️",
    title: "Karte oder Liste durchsuchen",
    desc: "Sieh, wo gerade gespielt wird — direkt auf der Karte oder in der Liste.",
    accent: "linear-gradient(135deg, #0066FF, #5B3DFF)",
    glow: "0 4px 16px rgba(0,102,255,0.30)",
  },
  {
    step: "02",
    icon: "🎯",
    title: "LFG starten oder beitreten",
    desc: "Sag wann & wo — wir matchen dich. Oder klick dich in eine offene Runde.",
    accent: "linear-gradient(135deg, #5B3DFF, #FF4D8A)",
    glow: "0 4px 16px rgba(91,61,255,0.40)",
  },
  {
    step: "03",
    icon: "👍",
    title: "Spielen & Kudos vergeben",
    desc: "Triff andere Spieler vor Ort und gib am Ende einen Daumen hoch.",
    accent: "linear-gradient(135deg, #FF4D8A, #FF6B35)",
    glow: "0 4px 16px rgba(255,77,138,0.30)",
  },
] as const;

function DashboardOnboardingCards() {
  return (
    <section>
      <div className="mb-3">
        <span className="mono-eyebrow block" style={{ color: "#FF4D8A" }}>
          Erste Schritte
        </span>
        <h2 className="mt-1 font-heading text-lg font-bold tracking-tight">
          So funktioniert&apos;s
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ONBOARD_STEPS.map((item) => (
          <div
            key={item.step}
            className="relative overflow-hidden rounded-xl border bg-card p-4"
            style={{
              borderColor: "color-mix(in oklch, #5B3DFF 22%, var(--border))",
              boxShadow: item.glow,
            }}
          >
            <span
              aria-hidden
              className="absolute left-0 right-0 top-0 h-[3px]"
              style={{ background: item.accent }}
            />
            <div
              className="absolute right-3 top-2 text-2xl font-bold leading-none"
              style={{
                fontFamily: "var(--font-mono), 'Fira Code', monospace",
                background: item.accent,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                opacity: 0.5,
              }}
            >
              {item.step}
            </div>
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="mb-1 font-heading text-sm font-bold tracking-tight">
              {item.title}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
