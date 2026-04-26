import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-2.5 z-50 px-4 sm:px-6">
      <nav
        className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between rounded-[14px] border border-border bg-card/92 px-8 backdrop-blur-md"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono), 'Fira Code', monospace",
            fontSize: "1.35em",
            fontWeight: 300,
            letterSpacing: "-1.5px",
            background: "var(--brand-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          CARDMEET
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/5 hover:text-primary"
            >
              Einloggen
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">
              Registrieren
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
