import Link from "next/link";

export const metadata = { title: "Datenschutzerklaerung" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Datenschutzerklaerung</h1>

      <div className="prose prose-sm dark:prose-invert space-y-4">
        <h2 className="text-lg font-semibold">
          1. Datenschutz auf einen Blick
        </h2>
        <p>
          Die folgenden Hinweise geben einen einfachen Ueberblick darueber,
          was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
        </p>

        <h2 className="text-lg font-semibold">2. Hosting</h2>
        <p>
          Diese Website wird bei Vercel Inc. gehostet. Die Server befinden sich
          in der EU (Frankfurt). Weitere Informationen finden Sie in der
          Datenschutzerklaerung von Vercel.
        </p>

        <h2 className="text-lg font-semibold">3. Datenbank</h2>
        <p>
          Wir verwenden Supabase (EU-Region Frankfurt) fuer die Speicherung
          von Nutzerdaten. Alle Daten werden verschluesselt uebertragen und
          gespeichert.
        </p>

        <h2 className="text-lg font-semibold">4. Standortdaten</h2>
        <p>
          Wir erheben Standortdaten nur mit Ihrer ausdruecklichen Einwilligung.
          Ihr genauer Standort wird nur unscharft (&sim;500m Radius) anderen
          Nutzern angezeigt. Den exakten Standort sehen nur Teilnehmer
          einer Session, der Sie beigetreten sind.
        </p>

        <h2 className="text-lg font-semibold">5. Ihre Rechte</h2>
        <p>
          Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Loeschung
          und Einschraenkung der Verarbeitung Ihrer Daten. Kontaktieren Sie
          uns unter [email@example.com].
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
