export const metadata = { title: "Datenschutzerklärung – CardMeet" };

export default function DatenschutzPage() {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Datenschutzerklärung</h1>
        <p className="text-muted-foreground text-xs">Zuletzt aktualisiert: April 2026</p>
      </div>

      <Section title="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der DSGVO ist:<br />
          Denis Kaliberda, [Adresse], Deutschland<br />
          E-Mail: <a href="mailto:kontakt@cardmeet.de" className="text-primary hover:underline">kontakt@cardmeet.de</a>
        </p>
      </Section>

      <Section title="2. Welche Daten wir erheben">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Registrierungsdaten:</strong> E-Mail-Adresse, Benutzername</li>
          <li><strong>Profildaten:</strong> Anzeigename, Bio, Profilbild, bevorzugte Spiele (freiwillig)</li>
          <li><strong>Standortdaten:</strong> Stadt oder ungefährer Standort (nur mit ausdrücklicher Einwilligung)</li>
          <li><strong>Session-Daten:</strong> Erstellte und besuchte Sessions, Nachrichten im Session-Chat</li>
          <li><strong>Bewertungen:</strong> Abgegebene und erhaltene Spielerbewertungen</li>
        </ul>
      </Section>

      <Section title="3. Zweck der Verarbeitung">
        <p>
          Wir verarbeiten Ihre Daten ausschließlich zum Betrieb der CardMeet-Plattform —
          insbesondere zur Vermittlung von lokalen TCG-Sessions zwischen Spielern.
          Es findet keine Weitergabe an Dritte zu Werbezwecken statt.
        </p>
      </Section>

      <Section title="4. Hosting & Infrastruktur">
        <p>
          <strong>Vercel Inc.</strong> (Hosting, Server in der EU / Frankfurt)<br />
          <strong>Supabase Inc.</strong> (Datenbank & Authentifizierung, EU-Region Frankfurt)
        </p>
        <p className="mt-2">
          Alle Daten werden verschlüsselt übertragen (HTTPS) und gespeichert.
          Mit beiden Anbietern bestehen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO.
        </p>
      </Section>

      <Section title="5. Standortdaten">
        <p>
          Ihr Standort wird nur mit Ihrer ausdrücklichen Einwilligung über die
          Browser-Geolocation-API erhoben. Der genaue Standort einer Session ist
          nur für angemeldete Teilnehmer sichtbar. Anderen Nutzern wird lediglich
          die Stadt oder ein ungefährer Bereich angezeigt.
        </p>
      </Section>

      <Section title="6. Speicherdauer">
        <p>
          Ihre Daten werden gespeichert, solange Ihr Account aktiv ist.
          Nach einer Kontolöschung werden alle personenbezogenen Daten
          innerhalb von 30 Tagen unwiderruflich gelöscht.
        </p>
      </Section>

      <Section title="7. Ihre Rechte">
        <ul className="list-disc list-inside space-y-1">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
        </ul>
        <p className="mt-2">
          Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter:{" "}
          <a href="mailto:kontakt@cardmeet.de" className="text-primary hover:underline">
            kontakt@cardmeet.de
          </a>
        </p>
      </Section>

      <Section title="8. Beschwerderecht">
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
          Zuständig ist die Aufsichtsbehörde Ihres Wohnorts oder des Ortes des mutmaßlichen
          Verstoßes.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h2 className="font-semibold mb-2 text-base">{title}</h2>
      <div className="text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}
