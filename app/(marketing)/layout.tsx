import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-2.5 z-50 px-4 sm:px-6">
        <nav
          className="mx-auto flex h-16 max-w-screen-2xl items-center px-8"
          style={{
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Link
            href="/"
            className="text-primary"
            style={{
              fontFamily: "var(--font-mono), 'Fira Code', monospace",
              fontSize: "1.2em",
              fontWeight: 300,
              letterSpacing: "-1.5px",
            }}
          >
            ← CARDMEET
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
