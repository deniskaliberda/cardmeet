-- ============================================================
-- Test-Sessions für CardMeet
-- Verwendet automatisch das erste vorhandene Profil als Host.
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

DO $$
DECLARE
  host_uuid UUID;
BEGIN
  SELECT id INTO host_uuid FROM profiles LIMIT 1;

  IF host_uuid IS NULL THEN
    RAISE EXCEPTION 'Kein Profil gefunden. Bitte zuerst einen Account anlegen.';
  END IF;

  INSERT INTO sessions
    (host_id, title, description, tcg, format, power_level, max_players, current_players, status, city, location_name, location, scheduled_at)
  VALUES

  -- Berlin Mitte: Magic Commander
  (host_uuid,
   'Commander Runde – Casual bis Upgraded',
   'Suche 3 weitere Spieler für eine entspannte Commander-Runde. Power Level 2–3, keine cEDH-Decks.',
   'magic', 'commander', 3, 4, 1, 'open',
   'Berlin', 'Spielparadies Berlin Mitte',
   ST_SetSRID(ST_MakePoint(13.3880, 52.5186), 4326)::geography,
   now() + interval '2 days 18 hours'),

  -- Prenzlauer Berg: Pokemon Standard
  (host_uuid,
   'Pokémon Standard Turnier-Prep',
   'Trainingsrunde für das nächste Regionals. Bitte nur aktuelle Standard-Decks mitbringen.',
   'pokemon', 'standard', NULL, 2, 1, 'open',
   'Berlin', 'Café Prenzlauer Berg',
   ST_SetSRID(ST_MakePoint(13.4178, 52.5370), 4326)::geography,
   now() + interval '3 days 14 hours'),

  -- Friedrichshain: Magic Draft
  (host_uuid,
   'MKM Draft Night',
   'Boosterpacks werden geteilt. Bitte 9€ mitbringen. Anfänger willkommen!',
   'magic', 'draft', NULL, 8, 3, 'open',
   'Berlin', 'Comic Planet Friedrichshain',
   ST_SetSRID(ST_MakePoint(13.4548, 52.5145), 4326)::geography,
   now() + interval '4 days 17 hours 30 minutes'),

  -- Kreuzberg: One Piece
  (host_uuid,
   'One Piece Casual Spielrunde',
   'Lockere Runde für alle Levels. Wir spielen Standard-Format, gerne auch Deckbuilding-Tipps.',
   'onepiece', 'standard', NULL, 4, 2, 'open',
   'Berlin', 'Spielecafé Kreuzberg',
   ST_SetSRID(ST_MakePoint(13.4028, 52.4992), 4326)::geography,
   now() + interval '1 day 15 hours'),

  -- Charlottenburg: Lorcana
  (host_uuid,
   'Disney Lorcana – Casual Afternoon',
   'Wer Lorcana ausprobieren möchte oder einfach Spaß haben will. Leihdecks vorhanden!',
   'lorcana', 'casual', NULL, 4, 1, 'open',
   'Berlin', 'Gamebox Charlottenburg',
   ST_SetSRID(ST_MakePoint(13.3019, 52.5165), 4326)::geography,
   now() + interval '5 days 13 hours'),

  -- Neukölln: Yu-Gi-Oh
  (host_uuid,
   'Yu-Gi-Oh Advanced – Meta & Rogue',
   'Turniervorbereitung Advanced Format. Meta-Decks und Rogue-Decks herzlich willkommen.',
   'yugioh', 'advanced', 2, 4, 3, 'open',
   'Berlin', 'Kartenparadies Neukölln',
   ST_SetSRID(ST_MakePoint(13.4318, 52.4818), 4326)::geography,
   now() + interval '2 days 12 hours'),

  -- Potsdam: Magic Modern
  (host_uuid,
   'Modern FNM – Potsdam',
   'Wöchentliche Modern-Runde. Alle Levels willkommen, wir spielen Best-of-3.',
   'magic', 'modern', NULL, 4, 2, 'open',
   'Potsdam', 'Fantasywelt Potsdam',
   ST_SetSRID(ST_MakePoint(13.0645, 52.3906), 4326)::geography,
   now() + interval '6 days 19 hours'),

  -- Pankow: Flesh and Blood
  (host_uuid,
   'Flesh and Blood – Blitz Einstieg',
   'FaB Blitz für Einsteiger und Fortgeschrittene. Wer das Spiel nicht kennt, kann gerne zuschauen und lernen.',
   'flesh-and-blood', 'blitz', NULL, 4, 2, 'open',
   'Berlin', 'Brettspielladen Pankow',
   ST_SetSRID(ST_MakePoint(13.4028, 52.5693), 4326)::geography,
   now() + interval '3 days 16 hours'),

  -- Spandau: Pokemon Expanded
  (host_uuid,
   'Pokémon Expanded – Alles erlaubt',
   'Expanded-Format, ältere Karten willkommen. Entspannte Atmosphäre, kein Turnierstress.',
   'pokemon', 'expanded', NULL, 4, 3, 'open',
   'Berlin', 'Spieletreff Spandau',
   ST_SetSRID(ST_MakePoint(13.2014, 52.5353), 4326)::geography,
   now() + interval '7 days 11 hours'),

  -- Mitte: Weiss Schwarz
  (host_uuid,
   'Weiss Schwarz – Neo-Standard',
   'Neo-Standard Spielrunde. Alle Sets ab 2022 erlaubt. Englische und deutsche Karten ok.',
   'weiss-schwarz', 'neo-standard', NULL, 4, 1, 'open',
   'Berlin', 'Akihabara Shop Berlin',
   ST_SetSRID(ST_MakePoint(13.4100, 52.5250), 4326)::geography,
   now() + interval '4 days 15 hours'),

  -- Brandenburg: Magic Commander (etwas weiter weg)
  (host_uuid,
   'Commander Runde Brandenburg',
   'cEDH und Optimized willkommen. Wir spielen 4 Runden, dann Wertung.',
   'magic', 'commander', 5, 4, 2, 'open',
   'Brandenburg an der Havel', 'Spieleklub Brandenburg',
   ST_SetSRID(ST_MakePoint(12.5282, 52.4078), 4326)::geography,
   now() + interval '8 days 14 hours'),

  -- Tempelhof: Yu-Gi-Oh Rush Duel
  (host_uuid,
   'Rush Duel Treff',
   'Rush Duel Format – schnelle Partien, lockere Runde. Für Fans des Rush Duel Formats.',
   'yugioh', 'rush-duel', NULL, 4, 1, 'open',
   'Berlin', 'Jugendtreff Tempelhof',
   ST_SetSRID(ST_MakePoint(13.3833, 52.4694), 4326)::geography,
   now() + interval '5 days 17 hours');

  RAISE NOTICE 'Test-Sessions erfolgreich eingefügt. Host: %', host_uuid;
END $$;
