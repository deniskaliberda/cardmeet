import { getTCG } from "@/lib/config/tcg";

type Alert = {
  id: string;
  tcg: string;
  format: string | null;
  max_radius_km: number;
  days_of_week: number[];
  status: string;
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function ActiveAlertsBar({ alerts }: { alerts: Alert[] }) {
  const activeAlerts = alerts.filter((a) => a.status === "active");
  if (activeAlerts.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 mt-3 flex-wrap">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Aktive Alerts:
      </span>
      {activeAlerts.map((alert) => {
        const tcg = getTCG(alert.tcg);
        const dayStr = alert.days_of_week.length > 0
          ? alert.days_of_week.map((d) => DAY_LABELS[d]).join(" + ")
          : "";
        return (
          <div
            key={alert.id}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground bg-primary/8 border border-primary/25 cursor-pointer tonal-transition hover:border-primary hover:text-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#006b5c] animate-pulse shrink-0" />
            {tcg?.shortName ?? alert.tcg}
            {dayStr && ` · ${dayStr}`}
            {` · ${alert.max_radius_km} km`}
          </div>
        );
      })}
      <a
        href="/profile#alerts"
        className="text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        + Alert hinzufuegen
      </a>
    </div>
  );
}
