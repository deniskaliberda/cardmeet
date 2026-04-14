export const metadata = { title: "Impressum – CardMeet" };

export default function ImpressumPage() {
  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Impressum</h1>
        <p className="text-muted-foreground text-xs">Angaben gemäß § 5 TMG</p>
      </div>

      <Section title="Betreiber">
        <p>
          Denis Kaliberda<br />
          [Straße und Hausnummer]<br />
          [PLZ] [Stadt]<br />
          Deutschland
        </p>
      </Section>

      <Section title="Kontakt">
        <p>
          E-Mail: <a href="mailto:kontakt@cardmeet.de" className="text-primary hover:underline">kontakt@cardmeet.de</a>
        </p>
      </Section>

      <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 MStV">
        <p>
          Denis Kaliberda<br />
          [Adresse wie oben]
        </p>
      </Section>

      <Section title="Haftungsausschluss">
        <p>
          Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt.
          Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
          können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter
          sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich.
        </p>
      </Section>

      <Section title="Plattform der EU-Kommission zur Online-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an einem
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h2 className="font-semibold mb-2 text-base">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
