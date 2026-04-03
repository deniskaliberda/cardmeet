import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionDetail } from "@/components/session/session-detail";
import { SessionChat } from "@/components/session/session-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("title")
    .eq("id", id)
    .single();

  return { title: data?.title ?? "Session" };
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      `
      *,
      profiles!sessions_host_id_fkey (id, username, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: participants } = await supabase
    .from("session_participants")
    .select(
      `
      *,
      profiles (id, username, avatar_url)
    `
    )
    .eq("session_id", id)
    .eq("status", "joined");

  const { data: messages } = await supabase
    .from("messages")
    .select(
      `
      *,
      profiles (username, avatar_url)
    `
    )
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  const isHost = user?.id === session.host_id;
  const isParticipant = participants?.some((p) => p.user_id === user?.id);
  const canChat = isHost || isParticipant;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SessionDetail
        session={session}
        participants={participants ?? []}
        currentUserId={user?.id ?? ""}
        isHost={isHost}
        isParticipant={isParticipant ?? false}
      />

      {canChat && (
        <SessionChat
          sessionId={id}
          currentUserId={user!.id}
          initialMessages={messages ?? []}
        />
      )}
    </div>
  );
}
