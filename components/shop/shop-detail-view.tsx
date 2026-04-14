"use client";

import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  MapPin,
  Globe,
  Users,
  CalendarDays,
  ArrowLeft,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShopTcgBadges } from "./shop-tcg-badges";
import { ShopOpeningHours } from "./shop-opening-hours";
import { getTCG } from "@/lib/config/tcg";
import type { Shop } from "@/app/(app)/shops/actions";

type Session = {
  id: string;
  title: string;
  tcg: string;
  format: string;
  max_players: number;
  current_players: number;
  status: string;
  scheduled_at: string;
  city: string | null;
  location_name: string | null;
  profiles?: { username: string; avatar_url: string | null } | null;
};

type Props = {
  shop: Shop;
  sessions: Session[];
};

export function ShopDetailView({ shop, sessions }: Props) {
  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6">
      {/* Back link */}
      <Link
        href="/shops"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Alle Shops
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>
                {shop.address}
                {shop.district && shop.district !== shop.city
                  ? `, ${shop.district}`
                  : ""}
              </span>
            </div>
            {shop.website && (
              <a
                href={shop.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Globe className="h-3 w-3" />
                Website
              </a>
            )}
          </div>

          <Link href={`/sessions/create?shop=${shop.slug}`}>
            <Button size="sm" className="rounded-xl text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Session hier erstellen
            </Button>
          </Link>
        </div>

        {/* TCG badges */}
        <div className="mt-4">
          <ShopTcgBadges tcgs={shop.tcgs} />
        </div>

        {/* Info row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {shop.has_play_space && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {shop.play_space_seats
                ? `${shop.play_space_seats} Sitzplätze`
                : "Spielbereich vorhanden"}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {sessions.length}{" "}
            {sessions.length === 1 ? "Session" : "Sessions"}
          </span>
        </div>

        {shop.description && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            {shop.description}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sessions list — takes 2 columns */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            Kommende Sessions
          </h2>

          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Noch keine Sessions geplant.
              </p>
              <Link href={`/sessions/create?shop=${shop.slug}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl text-xs"
                >
                  Erste Session erstellen
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <ShopSessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — opening hours */}
        <div className="space-y-4">
          {shop.opening_hours && (
            <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Öffnungszeiten
              </h3>
              <ShopOpeningHours hours={shop.opening_hours} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopSessionCard({ session }: { session: Session }) {
  const tcg = getTCG(session.tcg);
  const slots = session.max_players - session.current_players;
  const slotsColor =
    slots === 0 ? "text-red-400" : slots === 1 ? "text-yellow-400" : "text-green-400";

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 transition-all hover:border-primary/40 hover:bg-card"
    >
      {/* TCG color bar */}
      <div
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: tcg?.color ?? "#666" }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {session.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            {tcg?.shortName} · {session.format}
          </span>
          <span className="flex items-center gap-0.5">
            <CalendarDays className="h-2.5 w-2.5" />
            {format(new Date(session.scheduled_at), "EEE d. MMM, HH:mm", {
              locale: de,
            })}
          </span>
          {session.profiles && (
            <span>von {(session.profiles as { username: string }).username}</span>
          )}
        </div>
      </div>

      {/* Slots */}
      <Badge
        variant="outline"
        className={`shrink-0 text-xs ${slotsColor} border-current/20`}
      >
        {session.current_players}/{session.max_players}
      </Badge>
    </Link>
  );
}
