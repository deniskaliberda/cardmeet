-- All shops support all TCGs
UPDATE shops
SET tcgs = ARRAY['magic','pokemon','yugioh','lorcana','onepiece','flesh-and-blood','digimon','weiss-schwarz'];
