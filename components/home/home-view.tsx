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

          {/* 5. TCG Shortcuts */}
          <TcgShortcuts />

          {/* 6. Friends playing */}
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
