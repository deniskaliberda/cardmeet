import { CreateSessionForm } from "@/components/session/create-session-form";

export const metadata = { title: "Session erstellen" };

export default function CreateSessionPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session erstellen</h1>
        <p className="text-muted-foreground">
          Erstelle eine Spielrunde und finde Mitspieler
        </p>
      </div>
      <CreateSessionForm />
    </div>
  );
}
