import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card py-5">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 text-sm text-muted-foreground sm:px-6">
        <span
          className="font-medium text-primary"
          style={{
            fontFamily: "var(--font-mono), 'Fira Code', monospace",
            letterSpacing: "-1px",
          }}
        >
          CARDMEET
        </span>
        <span className="hidden sm:inline">&copy; {new Date().getFullYear()}</span>
        <div className="flex gap-4">
          <Link href="/impressum" className="hover:text-foreground transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground transition-colors">
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
}
