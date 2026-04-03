import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          CardMeet
        </Link>
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Anmelden
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Registrieren</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
