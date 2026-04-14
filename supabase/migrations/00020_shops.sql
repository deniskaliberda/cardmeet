-- ============================================================
-- Migration 00020: Game Shop Hubs
-- Separate shops table for TCG stores as community hubs
-- ============================================================

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Berlin',
  postal_code TEXT,
  district TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  website TEXT,
  phone TEXT,
  tcgs TEXT[] DEFAULT '{}',
  has_play_space BOOLEAN DEFAULT true,
  play_space_seats INTEGER,
  opening_hours JSONB,
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: shops are always publicly readable
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shops viewable by everyone" ON shops FOR SELECT USING (true);
CREATE POLICY "Verified owners can update own shop" ON shops FOR UPDATE
  USING (auth.uid() = claimed_by AND is_verified = true);

-- Indexes
CREATE INDEX idx_shops_location ON shops USING GIST (location);
CREATE INDEX idx_shops_slug ON shops (slug);
CREATE INDEX idx_shops_city ON shops (city);

-- Link sessions to shops (optional FK)
ALTER TABLE sessions ADD COLUMN shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
CREATE INDEX idx_sessions_shop ON sessions (shop_id);

-- RPC: find nearby shops with optional TCG filter
CREATE OR REPLACE FUNCTION nearby_shops(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 25,
  filter_tcg TEXT DEFAULT NULL
)
RETURNS SETOF shops
LANGUAGE sql STABLE
AS $$
  SELECT s.*
  FROM shops s
  WHERE ST_DWithin(
    s.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000
  )
  AND (filter_tcg IS NULL OR filter_tcg = ANY(s.tcgs))
  ORDER BY ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );
$$;

-- Seed: 9 Berlin TCG stores
INSERT INTO shops (slug, name, address, city, district, location, tcgs, has_play_space, website) VALUES
(
  'funtainment',
  'FUNtainment Berlin',
  'Frankfurter Allee 79-83',
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
  'Berlin',
  'Oberschoeneweide',
  ST_SetSRID(ST_MakePoint(13.5164, 52.4592), 4326)::geography,
  ARRAY['magic','pokemon','onepiece','lorcana'],
  true,
  'https://heavensdoorberlin.de'
),
(
  'moonvillage',
  'MoonVillageGames',
  'Roelckestr. 10',
  'Berlin',
  'Weissensee',
  ST_SetSRID(ST_MakePoint(13.4641, 52.5561), 4326)::geography,
  ARRAY['magic','pokemon'],
  true,
  'https://moonvillagegames.de'
),
(
  'der-andere',
  'Der andere Spieleladen',
  'Prenzlauer Allee 192',
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
  'Muehlenstr. 45',
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
  'Berlin',
  'Berlin',
  'Berlin',
  ST_SetSRID(ST_MakePoint(13.405, 52.52), 4326)::geography,
  ARRAY['pokemon','yugioh','magic','onepiece'],
  true,
  'https://weltderkarten-berlin.de'
),
(
  'battle-bear',
  'Battle Bear Trading Cards',
  'Berlin',
  'Berlin',
  'Berlin',
  ST_SetSRID(ST_MakePoint(13.405, 52.52), 4326)::geography,
  ARRAY['pokemon','yugioh','magic','lorcana','onepiece'],
  true,
  'https://battle-bear.de'
);
