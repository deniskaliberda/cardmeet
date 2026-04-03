import Link from "next/link";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Impressum</h1>

      <div className="prose prose-sm dark:prose-invert space-y-4">
        <p>
          <strong>Angaben gemaess &sect; 5 TMG</strong>
        </p>
        <p>
          [Name]<br />
          [Strasse]<br />
          [PLZ Ort]
        </p>

        <h2 className="text-lg font-semibold">Kontakt</h2>
        <p>
          E-Mail: [email@example.com]
        </p>

        <h2 className="text-lg font-semibold">
          Verantwortlich fuer den Inhalt nach &sect; 55 Abs. 2 RStV
        </h2>
        <p>
          [Name]<br />
          [Adresse]
        </p>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Zurueck zur Startseite
        </Link>
      </div>
    </div>
  );
}
