import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">

          {/* Brand */}
          <div>
            <span
              className="font-medium text-primary"
              style={{
                fontFamily: "var(--font-mono), 'Fira Code', monospace",
                letterSpacing: "-1px",
              }}
            >
              CARDMEET
            </span>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              Die Plattform für lokale TCG-Sessions. Kostenlos & ohne Werbung.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center gap-1 sm:items-end text-sm text-muted-foreground">
            <div className="flex gap-5">
              <Link href="/sessions" className="hover:text-foreground transition-colors">
                Sessions
              </Link>
              <Link href="/impressum" className="hover:text-foreground transition-colors">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-foreground transition-colors">
                Datenschutz
              </Link>
            </div>
            <span className="text-xs mt-1">&copy; {year} CardMeet · Alle Rechte vorbehalten</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
