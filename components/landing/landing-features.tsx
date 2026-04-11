const STATS = [
  { value: "7", label: "TCGs verfügbar" },
  { value: "Berlin", label: "Startstadt" },
  { value: "kostenlos", label: "Für immer" },
  { value: "4.8 ⭐", label: "Ø Spieler-Rating" },
];

export function LandingFeatures({ sessionCount = 0 }: { sessionCount?: number }) {
  const stats = [
    { value: sessionCount > 0 ? String(sessionCount) : "–", label: "Aktive Sessions" },
    ...STATS,
  ];

  return (
    <div
      className="mt-6 rounded-2xl border-2 border-border bg-card px-8 py-6"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex flex-wrap items-center justify-around gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div
              className="text-2xl font-semibold"
              style={{
                fontFamily: "var(--font-heading), 'Outfit', sans-serif",
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #0066FF, #00C2A8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {stat.value}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
