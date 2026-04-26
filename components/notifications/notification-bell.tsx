"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  data?: { session_id?: string } | null;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data);
      });

    // Subscribe to changes — cover INSERT, UPDATE (read-state sync between
    // tabs/devices) and DELETE (so dismissing on phone reflects on desktop).
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (!removed.id) return;
          setNotifications((prev) => prev.filter((n) => n.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function markAllRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-[9px] bg-muted text-foreground transition-all duration-150 hover:text-primary hover:bg-primary/5 cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-xl shadow-[0_4px_24px_oklch(0.224_0.018_275.1/20%)] overflow-hidden">
            <div className="px-4 py-3 text-sm font-medium border-b border-[var(--outline-variant)]/15">
              Benachrichtigungen
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Keine Benachrichtigungen
                </div>
              ) : (
                notifications.map((n) => {
                  const sessionId = n.data?.session_id;
                  const SESSION_TYPES = new Set([
                    "chat_message", "session_invite", "session_full",
                    "session_cancelled", "session_alert",
                    "participant_joined", "participant_left",
                    "lfg_match",
                  ]);
                  const href = sessionId
                    ? `/sessions/${sessionId}`
                    : SESSION_TYPES.has(n.type)
                    ? "/my-sessions"
                    : null;

                  const inner = (
                    <>
                      <div className="text-xs font-medium">{n.title}</div>
                      {n.body && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTime(n.created_at)}
                      </div>
                    </>
                  );

                  const deleteBtn = (
                    <button
                      type="button"
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                      title="Löschen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  );

                  return href ? (
                    <a
                      key={n.id}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-start gap-2 px-4 py-3 transition-colors hover:bg-[var(--surface-container-low)] cursor-pointer group",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex-1 min-w-0">{inner}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {deleteBtn}
                        <span className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors text-xs">→</span>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-2 px-4 py-3 transition-colors hover:bg-[var(--surface-container-low)] group",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex-1 min-w-0">{inner}</div>
                      {deleteBtn}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Gerade eben";
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
}
