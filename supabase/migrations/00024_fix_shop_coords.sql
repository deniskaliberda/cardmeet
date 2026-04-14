-- ============================================================
-- Migration 00024: Fix shop coordinates + remove non-Berlin shops
-- ============================================================

-- Fix "Welt der Karten Berlin" — had placeholder coordinates (city center)
-- Real address: Ehrlichstraße 22, 10318 Berlin (Lichtenberg / Karlshorst)
UPDATE shops
SET
  address     = 'Ehrlichstraße 22',
  postal_code = '10318',
  district    = 'Lichtenberg',
  location    = ST_SetSRID(ST_MakePoint(13.5212167, 52.4802221), 4326)::geography
WHERE slug = 'welt-der-karten';

-- Remove "Battle Bear" — not a Berlin location (shop is in Kaiserslautern)
DELETE FROM shops WHERE slug = 'battle-bear';
