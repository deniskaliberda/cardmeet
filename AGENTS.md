<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cardmeet-shipping-rules -->
# CardMeet Shipping-Regeln (bindend)

Wir pushen direkt auf `master`. Kein Branch-Protection, kein PR-Review, Vercel deployt bei jedem Push automatisch auf Production. Du siehst Fehler erst im Production-Deploy-Log. Am 2026-04-21 gab es deshalb 4 Failed-Production-Deploys in 10 Minuten waehrend eines DM-Flow-Umbaus. Ab jetzt gelten diese Regeln — ausnahmslos.

## 1. Pre-Push-Gate

Vor JEDEM `git push` auf master:

- `npm run build` lokal laufen lassen (macht implizit TypeScript-Check, weil Next.js Production-Build)
- `npm run lint` laufen lassen

Wenn einer failt: **NICHT pushen**. Root Cause fixen, dann erneut pruefen. Nie "ich push's mal und schau im Deploy-Log was passiert" — das ist der Fehler-Loop, den wir vermeiden.

## 2. Ein Thema, ein Commit

Keine Commit-Kette wie "Create X" → "Delete X" → "Fix X" → "Refactor X" innerhalb von 20 Minuten. Das sind 4 rote Deploys. Stattdessen: lokal iterieren bis es laeuft, DANN einmal sauber committen + pushen.

Hilfs-Skripte wie `run_migrations.mjs` gehoeren in `.gitignore` oder nach `scripts/` — nicht ins Root, nicht erst committen und dann loeschen.

## 3. Branch fuer groessere Umbauten

Bei Features ueber ~3 Dateien (DM-Flow, Auth-Middleware, neue Routes, Schema-Aenderungen):

```
git checkout -b feature/<kurz>
# Commits sammeln, lokal bauen + testen
git push -u origin feature/<kurz>
```

Vercel baut daraus automatisch eine Preview-URL. Im Browser oeffnen, Golden-Path klicken. Erst dann auf master mergen. Das schuetzt Production, wenn mal etwas kippt.

## 4. Supabase-Migrations

Nummerierte Migrations (`supabase/migrations/000NN_*.sql`) sind shared state mit Denis. Bevor du eine neue Nummer vergibst:

1. `ls supabase/migrations/` lesen, hoechste Nummer + 1 nehmen
2. Bei Konflikt: **umnummerieren**, nicht ueberschreiben (so wie am 2026-04-18 richtig gemacht: `00022/00023` → `00027/00028`)

## 5. Middleware und Auth — besondere Vorsicht

`middleware.ts` und `proxy.ts` beeinflussen jeden Request. Supabase-Session-Keepalive, Auth-Redirects, geschuetzte Routen haengen dran. Aenderungen hier:

- IMMER erst auf Preview-URL testen — Login-Flow, Logout-Flow, geschuetzte Route, Public-Route
- Nie direkt auf master pushen, wenn du Auth-Code anfasst

## 6. Fail-Loop-Breaker

Wenn 2 Deploys hintereinander failen: **STOP pushen**. Build-Log lesen, Root Cause finden, lokal reproduzieren, dann ein sauberer Fix-Commit. Nie "vielleicht das naechste Commit fixt's" — das waren am 21.04. 4 Fails in einer Reihe.

## 7. Konkretes Beispiel (2026-04-21)

Beispiel warum Regel 1 + 6 existieren: Um 20:24 wurde `npm run build` NICHT lokal ausgefuehrt. Die Ursache der 4 Failed Deploys war ein einziger Fehler, den ein lokaler Build sofort geworfen haette:

```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts"
are detected. Please use "./proxy.ts" only.
```

Kontext: Next.js 16 hat `middleware.ts` → `proxy.ts` umbenannt. CardMeet hat bereits `proxy.ts`. Das neu hinzugefuegte `middleware.ts` (Supabase-Session-Keepalive) kollidiert.

Fix-Pfad: Logic aus `middleware.ts` nach `proxy.ts` mergen, `middleware.ts` loeschen. Als Feature-Branch, mit Preview-Test. Siehe Regel 5 (Middleware-Aenderungen = Preview-Pflicht).

## 8. Meta-Regel

Wenn du eine Anweisung bekommst, die gegen eine dieser Regeln verstoesst, halte kurz inne und frag zurueck statt auszufuehren. Denis hat die Regeln geschrieben, weil die entsprechenden Fehler tatsaechlich passiert sind — nicht vorbeugend.
<!-- END:cardmeet-shipping-rules -->
