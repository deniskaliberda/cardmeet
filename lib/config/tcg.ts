export type PowerLevelConfig = {
  level: number;
  name: string;
  description: string;
  color: string;
};

export type FormatConfig = {
  id: string;
  name: string;
  playerCount: { min: number; max: number; default: number };
  powerLevels?: PowerLevelConfig[];
};

export type TCGConfig = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  formats: FormatConfig[];
  defaultPlayerCount: number;
  maxPlayerCount: number;
};

export const TCG_LIST: TCGConfig[] = [
  {
    id: "magic",
    name: "Magic: The Gathering",
    shortName: "Magic",
    icon: "Flame",
    color: "#E2A233",
    defaultPlayerCount: 4,
    maxPlayerCount: 8,
    formats: [
      {
        id: "commander",
        name: "Commander / EDH",
        playerCount: { min: 2, max: 6, default: 4 },
        powerLevels: [
          { level: 1, name: "Exhibition", description: "Theme-Decks, schwaecher als Precons", color: "#10b981" },
          { level: 2, name: "Core", description: "Precon-Level, klare Win-Conditions", color: "#3b82f6" },
          { level: 3, name: "Upgraded", description: "Staerker als Precons, bis 3 Game Changers", color: "#a855f7" },
          { level: 4, name: "Optimized", description: "Keine Einschraenkungen ausser Banlist", color: "#f59e0b" },
          { level: 5, name: "cEDH", description: "Kompetitiv, metagame-optimiert", color: "#ef4444" },
        ],
      },
      {
        id: "standard",
        name: "Standard",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "modern",
        name: "Modern",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "draft",
        name: "Draft / Sealed",
        playerCount: { min: 2, max: 8, default: 8 },
      },
    ],
  },
  {
    id: "pokemon",
    name: "Pokemon TCG",
    shortName: "Pokemon",
    icon: "Zap",
    color: "#FFCB05",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "standard",
        name: "Standard",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "expanded",
        name: "Expanded",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "casual",
        name: "Casual / Fun",
        playerCount: { min: 2, max: 4, default: 2 },
      },
    ],
  },
  {
    id: "yugioh",
    name: "Yu-Gi-Oh!",
    shortName: "Yu-Gi-Oh!",
    icon: "Triangle",
    color: "#B91C1C",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "advanced",
        name: "Advanced",
        playerCount: { min: 2, max: 2, default: 2 },
        powerLevels: [
          { level: 1, name: "Casual", description: "Fun decks, no meta", color: "#22c55e" },
          { level: 2, name: "Competitive", description: "Meta decks, tournament practice", color: "#ef4444" },
        ],
      },
      {
        id: "speed-duel",
        name: "Speed Duel",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "rush-duel",
        name: "Rush Duel",
        playerCount: { min: 2, max: 2, default: 2 },
      },
    ],
  },
  {
    id: "lorcana",
    name: "Disney Lorcana",
    shortName: "Lorcana",
    icon: "Sparkles",
    color: "#6366F1",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "core",
        name: "Core",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "casual",
        name: "Casual",
        playerCount: { min: 2, max: 4, default: 2 },
      },
    ],
  },
  {
    id: "onepiece",
    name: "One Piece Card Game",
    shortName: "One Piece",
    icon: "Anchor",
    color: "#DC2626",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "standard",
        name: "Standard",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "casual",
        name: "Casual",
        playerCount: { min: 2, max: 4, default: 2 },
      },
    ],
  },
  {
    id: "flesh-and-blood",
    name: "Flesh and Blood",
    shortName: "FaB",
    icon: "Sword",
    color: "#9333EA",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "blitz",
        name: "Blitz",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "classic-constructed",
        name: "Classic Constructed",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "draft",
        name: "Draft",
        playerCount: { min: 2, max: 8, default: 8 },
      },
    ],
  },
  {
    id: "weiss-schwarz",
    name: "Weiss Schwarz",
    shortName: "Weiss",
    icon: "Star",
    color: "#0EA5E9",
    defaultPlayerCount: 2,
    maxPlayerCount: 4,
    formats: [
      {
        id: "standard",
        name: "Standard",
        playerCount: { min: 2, max: 2, default: 2 },
      },
      {
        id: "neo-standard",
        name: "Neo-Standard",
        playerCount: { min: 2, max: 2, default: 2 },
      },
    ],
  },
];

export function getTCG(id: string): TCGConfig | undefined {
  return TCG_LIST.find((tcg) => tcg.id === id);
}

export function getFormat(tcgId: string, formatId: string): FormatConfig | undefined {
  return getTCG(tcgId)?.formats.find((f) => f.id === formatId);
}

export function getPowerLevel(tcgId: string, formatId: string, level: number): PowerLevelConfig | undefined {
  return getFormat(tcgId, formatId)?.powerLevels?.find((p) => p.level === level);
}
