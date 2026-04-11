export type TCGStore = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  tcgs: string[];
  website?: string;
};

export const BERLIN_TCG_STORES: TCGStore[] = [
  {
    id: "funtainment",
    name: "FUNtainment Berlin",
    address: "Frankfurter Allee 79-83",
    city: "Berlin",
    district: "Friedrichshain",
    lat: 52.5137,
    lng: 13.4636,
    tcgs: ["magic", "pokemon", "yugioh", "flesh-and-blood", "lorcana", "onepiece"],
    website: "https://funtainmentberlin.de",
  },
  {
    id: "heavens-door",
    name: "Heaven's Door",
    address: "Wilhelminenhofstr. 64",
    city: "Berlin",
    district: "Oberschoeneweide",
    lat: 52.4592,
    lng: 13.5164,
    tcgs: ["magic", "pokemon", "onepiece", "lorcana"],
    website: "https://heavensdoorberlin.de",
  },
  {
    id: "moonvillage",
    name: "MoonVillageGames",
    address: "Roelckestr. 10",
    city: "Berlin",
    district: "Weissensee",
    lat: 52.5561,
    lng: 13.4641,
    tcgs: ["magic", "pokemon"],
    website: "https://moonvillagegames.de",
  },
  {
    id: "der-andere",
    name: "Der andere Spieleladen",
    address: "Prenzlauer Allee 192",
    city: "Berlin",
    district: "Prenzlauer Berg",
    lat: 52.5345,
    lng: 13.4219,
    tcgs: ["magic", "pokemon", "yugioh", "digimon"],
    website: "https://der-andere-spieleladen.eu",
  },
  {
    id: "mana-games",
    name: "Mana Games",
    address: "Blissestr. 5",
    city: "Berlin",
    district: "Wilmersdorf",
    lat: 52.4836,
    lng: 13.3181,
    tcgs: ["magic", "yugioh", "onepiece", "flesh-and-blood"],
    website: "https://managames.de",
  },
  {
    id: "pruckis",
    name: "Prueckis Cards",
    address: "Muehlenstr. 45",
    city: "Berlin",
    district: "Friedrichshain",
    lat: 52.5105,
    lng: 13.4401,
    tcgs: ["pokemon", "yugioh", "magic", "onepiece"],
    website: "https://pruckis.de",
  },
  {
    id: "gate-to-the-games",
    name: "Gate to the Games",
    address: "Badstr. 4",
    city: "Berlin",
    district: "Gesundbrunnen",
    lat: 52.5494,
    lng: 13.3835,
    tcgs: ["pokemon", "yugioh", "magic"],
  },
  {
    id: "welt-der-karten",
    name: "Welt der Karten Berlin",
    address: "Berlin",
    city: "Berlin",
    district: "Berlin",
    lat: 52.52,
    lng: 13.405,
    tcgs: ["pokemon", "yugioh", "magic", "onepiece"],
    website: "https://weltderkarten-berlin.de",
  },
  {
    id: "battle-bear",
    name: "Battle Bear Trading Cards",
    address: "Berlin",
    city: "Berlin",
    district: "Berlin",
    lat: 52.52,
    lng: 13.405,
    tcgs: ["pokemon", "yugioh", "magic", "lorcana", "onepiece"],
    website: "https://battle-bear.de",
  },
];

export function getStoresForTCG(tcgId: string): TCGStore[] {
  return BERLIN_TCG_STORES.filter((s) => s.tcgs.includes(tcgId));
}

export function getStore(id: string): TCGStore | undefined {
  return BERLIN_TCG_STORES.find((s) => s.id === id);
}
