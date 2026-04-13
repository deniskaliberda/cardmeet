"use client";

import { useState, useEffect, useRef, useTransition, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageCircle, X, ArrowLeft, Send } from "lucide-react";
import { getDMConversations, getDMMessages, sendDM } from "@/app/(app)/chat/actions";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Conversation = {
  partner: { id: string; username: string; avatar_url: string | null };
  lastMessage: { content: string; created_at: string; isMine: boolean };
  unreadCount: number;
};

type DMessage = {
  id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

function DmPanelInner({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<Conversation["partner"] | null>(null);
  const [messages, setMessages] = useState<DMessage[]>([]);
  const [input, setInput] = useState("");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-open panel from ?dm=userId URL param
  useEffect(() => {
    const dmUserId = searchParams.get("dm");
    if (!dmUserId) return;
    setOpen(true);
    setView("chat");
    setLoadingMsgs(true);
    setMessages([]);
    getDMMessages(dmUserId).then(({ messages }) => {
      setMessages(messages as DMessage[]);
      setLoadingMsgs(false);
    });
    // We don't have the username here — fetch from conversations or just set id
    setActivePartner({ id: dmUserId, username: "...", avatar_url: null });
    getDMConversations().then(({ conversations }) => {
      setConversations(conversations);
      setUnreadTotal(conversations.reduce((s, c) => s + c.unreadCount, 0));
      const conv = conversations.find((c) => c.partner.id === dmUserId);
      if (conv) setActivePartner(conv.partner);
    });
    // Remove ?dm param from URL without reload
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dm");
    router.replace(params.toString() ? `?${params}` : window.location.pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load conversations when panel opens
  useEffect(() => {
    if (!open) return;
    setLoadingConvs(true);
    getDMConversations().then(({ conversations }) => {
      setConversations(conversations);
      setUnreadTotal(conversations.reduce((s, c) => s + c.unreadCount, 0));
      setLoadingConvs(false);
    });
  }, [open]);

  // Realtime: new DMs → update list + active chat
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dm-panel-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DMessage & { sender_id: string };

          // If active chat with this sender → append message
          if (activePartner?.id === newMsg.sender_id) {
            setMessages((prev) => [...prev, newMsg]);
          } else {
            // Update unread badge
            setUnreadTotal((n) => n + 1);
            setConversations((prev) =>
              prev.map((c) =>
                c.partner.id === newMsg.sender_id
                  ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: { content: newMsg.content, created_at: newMsg.created_at, isMine: false } }
                  : c
              )
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, activePartner?.id]);

  async function openConversation(partner: Conversation["partner"]) {
    setActivePartner(partner);
    setView("chat");
    setLoadingMsgs(true);
    setMessages([]);
    const { messages } = await getDMMessages(partner.id);
    setMessages(messages as DMessage[]);
    setLoadingMsgs(false);
    // Clear unread count for this partner
    setConversations((prev) =>
      prev.map((c) => c.partner.id === partner.id ? { ...c, unreadCount: 0 } : c)
    );
    setUnreadTotal((n) => Math.max(0, n - (conversations.find(c => c.partner.id === partner.id)?.unreadCount ?? 0)));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activePartner) return;
    const content = input.trim();
    setInput("");

    // Optimistic insert
    const optimistic: DMessage = {
      id: `opt-${Date.now()}`,
      sender_id: userId,
      content,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const result = await sendDM(activePartner.id, content);
      if (result && "error" in result) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } else {
        // Update conversation list
        setConversations((prev) => {
          const existing = prev.find((c) => c.partner.id === activePartner.id);
          const updated = {
            partner: activePartner,
            lastMessage: { content, created_at: new Date().toISOString(), isMine: true },
            unreadCount: 0,
          };
          if (existing) {
            return [updated, ...prev.filter((c) => c.partner.id !== activePartner.id)];
          }
          return [updated, ...prev];
        });
      }
    });
  }

  function goBack() {
    setView("list");
    setActivePartner(null);
    setMessages([]);
    // Refresh conversation list
    getDMConversations().then(({ conversations }) => {
      setConversations(conversations);
      setUnreadTotal(conversations.reduce((s, c) => s + c.unreadCount, 0));
    });
  }

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) setView("list"); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-card transition-colors hover:border-primary hover:text-primary cursor-pointer"
        aria-label="Nachrichten"
      >
        <MessageCircle className="h-4 w-4" />
        {unreadTotal > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-4 top-20 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
        style={{ width: 320, height: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {view === "chat" && (
            <button
              onClick={goBack}
              className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="flex-1 text-sm font-semibold">
            {view === "chat" ? activePartner?.username : "Nachrichten"}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conversation list */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto">
            {loadingConvs && (
              <p className="py-8 text-center text-xs text-muted-foreground">Laden...</p>
            )}
            {!loadingConvs && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Noch keine Nachrichten</p>
                <p className="text-xs text-muted-foreground">
                  Gehe zu Freunde und starte ein Gespräch
                </p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.partner.id}
                onClick={() => openConversation(conv.partner)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {initials(conv.partner.username)}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-semibold" : "font-medium")}>
                      {conv.partner.username}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), { locale: de, addSuffix: false })}
                    </span>
                  </div>
                  <p className={cn("truncate text-xs", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {conv.lastMessage.isMine ? "Du: " : ""}{conv.lastMessage.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Chat view */}
        {view === "chat" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 px-3 py-3">
              {loadingMsgs && (
                <p className="py-4 text-center text-xs text-muted-foreground">Laden...</p>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Noch keine Nachrichten
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                        isOwn
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted text-foreground"
                      )}
                    >
                      <p className="leading-snug">{msg.content}</p>
                      <p className={cn("mt-0.5 text-[10px]", isOwn ? "text-primary-foreground/60 text-right" : "text-muted-foreground")}>
                        {format(new Date(msg.created_at), "HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t px-3 py-2.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nachricht..."
                maxLength={2000}
                className="flex-1 rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 cursor-pointer disabled:cursor-default transition-opacity"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js
export function DmPanel(props: { userId: string }) {
  return (
    <Suspense fallback={null}>
      <DmPanelInner {...props} />
    </Suspense>
  );
}
