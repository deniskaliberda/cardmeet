import Link from "next/link";
import { Gamepad2, MapPin, Store } from "lucide-react";

type Props = {
  openSessionCount: number;
  nearbyCount: number;
  shopCount: number;
};

export function QuickStats({ openSessionCount, nearbyCount, shopCount }: Props) {
  const stats = [
    {
      href: "/sessions",
      icon: Gamepad2,
      value: openSessionCount,
      label: "Sessions offen",
      color: "oklch(0.62 0.22 264)",
    },
    {
      href: "/sessions",
      icon: MapPin,
      value: nearbyCount,
      label: "In deiner Nähe",
      color: "oklch(0.75 0.18 160)",
    },
    {
      href: "/shops",
      icon: Store,
      value: shopCount,
      label: "Shops aktiv",
      color: "oklch(0.664 0.196 41)",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3.5 text-center transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.97]"
          >
            <Icon className="h-4.5 w-4.5 text-muted-foreground" />
            <span
              className="font-heading text-2xl font-bold leading-none"
              style={{ color: stat.color }}
            >
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              {stat.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
