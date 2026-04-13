import Link from "next/link";
import { TCG_LIST } from "@/lib/config/tcg";
import { TCGIcon } from "@/components/icons/tcg-icons";

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
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
              style={{ borderColor: tcg.color, backgroundColor: `${tcg.color}15` }}
            >
              <TCGIcon tcgId={tcg.id} className="h-6 w-6" color={tcg.color} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {tcg.shortName}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
