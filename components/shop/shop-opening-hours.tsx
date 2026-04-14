"use client";

const DAY_LABELS: Record<string, string> = {
  mon: "Montag",
  tue: "Dienstag",
  wed: "Mittwoch",
  thu: "Donnerstag",
  fri: "Freitag",
  sat: "Samstag",
  sun: "Sonntag",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function getCurrentDayKey(): string {
  const day = new Date().getDay();
  return DAY_ORDER[day === 0 ? 6 : day - 1];
}

export function ShopOpeningHours({
  hours,
}: {
  hours: Record<string, string> | null;
}) {
  if (!hours) return null;

  const today = getCurrentDayKey();

  return (
    <div className="space-y-1">
      {DAY_ORDER.map((day) => {
        const isToday = day === today;
        const value = hours[day];
        return (
          <div
            key={day}
            className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-xs ${
              isToday
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <span>{DAY_LABELS[day]}</span>
            <span>{value ?? "Geschlossen"}</span>
          </div>
        );
      })}
    </div>
  );
}
