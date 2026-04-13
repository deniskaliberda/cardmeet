"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Clock, Check, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { searchUsers, sendFriendRequest, removeFriend } from "@/app/(app)/friends/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserResult = {
  id: string;
  username: string;
  avatar_url: string | null;
  friendship_id: string | null;
  friendship_status: string | null;
};

export function AddFriendSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchUsers(value);
      setSearching(false);
      if ("users" in res) setResults(res.users ?? []);
    }, 350);
  }

  function handleSendRequest(user: UserResult) {
    startTransition(async () => {
      const result = await sendFriendRequest(user.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Anfrage an ${user.username} gesendet`);
        setResults((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, friendship_status: "pending", friendship_id: "sent" }
              : u
          )
        );
        router.refresh();
      }
    });
  }

  function handleRemove(user: UserResult) {
    if (!user.friendship_id) return;
    startTransition(async () => {
      const result = await removeFriend(user.friendship_id!);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        setResults((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, friendship_status: null, friendship_id: null }
              : u
          )
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Username suchen..."
          className="pl-9 rounded-xl"
        />
      </div>

      {searching && (
        <p className="text-xs text-muted-foreground text-center py-2">Suche...</p>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Kein User gefunden
        </p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => {
            const isFriend = user.friendship_status === "accepted";
            const isPending = user.friendship_status === "pending";
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-xl bg-[var(--surface-container-low)] p-3"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary text-white text-xs font-medium">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">
                  {user.username}
                </span>
                {isFriend ? (
                  <button
                    onClick={() => handleRemove(user)}
                    disabled={pending}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Freund
                  </button>
                ) : isPending ? (
                  <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-muted">
                    <Clock className="h-3.5 w-3.5" />
                    Ausstehend
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendRequest(user)}
                    disabled={pending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50",
                      "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Hinzufügen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
