-- ============================================================
-- Migration 00025: Add lat/lng generated columns to shops
-- + upsert all 8 Berlin shops with correct coordinates
-- ============================================================

-- Generated columns so lat/lng can be queried directly via REST API
-- (PostGIS geography columns return WKB hex via the JS client, not GeoJSON)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

-- Upsert all 8 Berlin shops with verified addresses + coordinates
INSERT INTO shops (slug, name, address, postal_code, city, district, location, tcgs, has_play_space, website)
VALUES
(
  'funtainment',
  'FUNtainment Berlin',
  'Frankfurter Allee 79-83',
  '10247',
  'Berlin',
  'Friedrichshain',
  ST_SetSRID(ST_MakePoint(13.4636, 52.5137), 4326)::geography,
  ARRAY['magic','pokemon','yugioh','flesh-and-blood','lorcana','onepiece'],
  true,
  'https://funtainmentberlin.de'
),
(
  'heavens-door',
  'Heaven''s Door',
  'Wilhelminenhofstr. 64',
  '12459',
  'Berlin',
  'Oberschöneweide',
  ST_SetSRID(ST_MakePoint(13.5164, 52.4592), 4326)::geography,
  ARRAY['magic','pokemon','onepiece','lorcana'],
  true,
  'https://heavensdoorberlin.de'
),
(
  'moonvillage',
  'MoonVillageGames',
  'Roelckestr. 10',
  '13086',
  'Berlin',
  'Weißensee',
  ST_SetSRID(ST_MakePoint(13.4641, 52.5561), 4326)::geography,
  ARRAY['magic','pokemon'],
  true,
  'https://moonvillagegames.de'
),
(
  'der-andere',
  'Der andere Spieleladen',
  'Prenzlauer Allee 192',
  '10405',
  'Berlin',
  'Prenzlauer Berg',
  ST_SetSRID(ST_MakePoint(13.4219, 52.5345), 4326)::geography,
  ARRAY['magic','pokemon','yugioh','digimon'],
  true,
  'https://der-andere-spieleladen.eu'
),
(
  'mana-games',
  'Mana Games',
  'Blissestr. 5',
  '10713',
  'Berlin',
  'Wilmersdorf',
  ST_SetSRID(ST_MakePoint(13.3181, 52.4836), 4326)::geography,
  ARRAY['magic','yugioh','onepiece','flesh-and-blood'],
  true,
  'https://managames.de'
),
(
  'pruckis',
  'Prueckis Cards',
  'Mühlenstr. 45',
  '10243',
  'Berlin',
  'Friedrichshain',
  ST_SetSRID(ST_MakePoint(13.4401, 52.5105), 4326)::geography,
  ARRAY['pokemon','yugioh','magic','onepiece'],
  true,
  'https://pruckis.de'
),
(
  'gate-to-the-games',
  'Gate to the Games',
  'Badstr. 4',
  '13357',
  'Berlin',
  'Gesundbrunnen',
  ST_SetSRID(ST_MakePoint(13.3835, 52.5494), 4326)::geography,
  ARRAY['pokemon','yugioh','magic'],
  true,
  NULL
),
(
  'welt-der-karten',
  'Welt der Karten Berlin',
  'Ehrlichstraße 22',
  '10318',
  'Berlin',
  'Lichtenberg',
  ST_SetSRID(ST_MakePoint(13.5212167, 52.4802221), 4326)::geography,
  ARRAY['pokemon','yugioh','magic','onepiece'],
  true,
  'https://weltderkarten-berlin.de'
)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  postal_code  = EXCLUDED.postal_code,
  city         = EXCLUDED.city,
  district     = EXCLUDED.district,
  location     = EXCLUDED.location,
  tcgs         = EXCLUDED.tcgs,
  has_play_space = EXCLUDED.has_play_space,
  website      = EXCLUDED.website;

-- Remove Battle Bear if it still exists (not a Berlin shop)
DELETE FROM shops WHERE slug = 'battle-bear';
