"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HeroActions } from "@/components/home/hero-actions";
import { LfgButton } from "@/components/home/lfg-button";
import { LfgActiveBadge } from "@/components/lfg/lfg-active-badge";
import { NearbySessions } from "@/components/home/nearby-sessions";
import { UpcomingSessions } from "@/components/home/upcoming-sessions";
import { FriendsPlaying } from "@/components/home/friends-playing";
import { TcgShortcuts } from "@/components/home/tcg-shortcuts";
import { MySessionsView } from "@/components/session/my-sessions-view";

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
        <div className="space-y-8 max-w-2xl">
          <LfgButton
            preferredTcgs={preferredTcgs}
            userLat={userLat}
            userLng={userLng}
            userCity={userCity}
            activeLfgCount={activeLfgPosts.length}
          />
          <LfgActiveBadge posts={activeLfgPosts} />
          <FriendsPlaying sessions={friendsSessions} />
          <HeroActions openSessionCount={openCount} />
          {allUpcoming.length > 0 && <UpcomingSessions sessions={allUpcoming} />}
          <TcgShortcuts />
          <NearbySessions
            sessions={nearbyMapped}
            currentUserId={currentUserId}
            joinedSessionIds={joinedSessionIds}
          />
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
