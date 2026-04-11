-- Store geocoded coordinates for the user's home city
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city_lat float8,
  ADD COLUMN IF NOT EXISTS city_lng float8;
