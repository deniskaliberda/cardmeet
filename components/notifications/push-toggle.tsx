"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushToggle({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY);
    checkSubscription();
  }, []);

  async function checkSubscription() {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setEnabled(!!sub);
  }

  async function toggle() {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push-Benachrichtigungen sind noch nicht konfiguriert (VAPID-Key fehlt)");
      return;
    }
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (enabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          const supabase = createClient();
          await (supabase as any).from("push_subscriptions")
            .delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
        }
        setEnabled(false);
        toast.success("Push-Benachrichtigungen deaktiviert");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Benachrichtigungen wurden blockiert");
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        const supabase = createClient();
        await (supabase as any).from("push_subscriptions").upsert({
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: (json.keys as any)?.p256dh,
          auth: (json.keys as any)?.auth,
        }, { onConflict: "user_id,endpoint" });
        setEnabled(true);
        toast.success("Push-Benachrichtigungen aktiviert");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="flex w-full items-center justify-between rounded-xl border-2 border-border px-4 py-3 text-sm transition-colors hover:border-primary disabled:opacity-50 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
        <div className="text-left">
          <div className="font-medium text-sm">Push-Benachrichtigungen</div>
          <div className="text-xs text-muted-foreground">
            {enabled ? "Aktiviert — du wirst benachrichtigt" : "Deaktiviert"}
          </div>
        </div>
      </div>
      <div className={`h-5 w-9 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}>
        <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </button>
  );
}
