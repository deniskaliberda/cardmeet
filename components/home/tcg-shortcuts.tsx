import Link from "next/link";
import { TCG_LIST } from "@/lib/config/tcg";
import { TCGImage } from "@/components/icons/tcg-icons";

export function TcgShortcuts() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Spiele
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
        {TCG_LIST.map((tcg) => (
          <Link
            key={tcg.id}
            href={`/sessions?tcg=${tcg.id}`}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 overflow-hidden transition-transform hover:scale-110 active:scale-95"
              style={{ borderColor: tcg.color, backgroundColor: `${tcg.color}20` }}
            >
              <TCGImage tcgId={tcg.id} size={40} className="rounded-full" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {tcg.shortName}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
