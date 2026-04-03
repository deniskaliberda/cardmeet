type IconProps = {
  className?: string;
  color?: string;
};

// Magic: The Gathering — Planeswalker symbol (stylized 5-point flame)
export function MagicIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4c-1.5 8-6 14-12 18 4 2 7 6 8 12-2-5-6-8-12-9 6 4 9 10 9 17-4-5-10-8-17-8 7 3 12 9 13 16C15 44 10 36 10 27c0-5 2-10 5-14 4-5 10-8 17-9zm0 0c1.5 8 6 14 12 18-4 2-7 6-8 12 2-5 6-8 12-9-6 4-9 10-9 17 4-5 10-8 17-8-7 3-12 9-13 16 6-6 11-14 11-23 0-5-2-10-5-14-4-5-10-8-17-9z" />
      <circle cx="32" cy="38" r="6" />
    </svg>
  );
}

// Pokemon — Pokeball
export function PokemonIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" />
      <line x1="4" y1="32" x2="22" y2="32" />
      <line x1="42" y1="32" x2="60" y2="32" />
      <circle cx="32" cy="32" r="10" />
      <circle cx="32" cy="32" r="5" fill={color} />
      <path d="M4 32 A28 28 0 0 0 60 32" strokeWidth="0" fill={color} opacity="0.15" />
    </svg>
  );
}

// Yu-Gi-Oh! — Millennium Eye
export function YugiohIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Eye shape */}
      <path d="M32 20C18 20 8 32 8 32s10 12 24 12 24-12 24-12S46 20 32 20z" fill="none" stroke={color} strokeWidth="3" />
      {/* Pupil */}
      <circle cx="32" cy="32" r="7" />
      {/* Egyptian triangle above */}
      <path d="M32 4L26 18h12L32 4z" />
      {/* Lines below eye */}
      <line x1="32" y1="44" x2="32" y2="58" stroke={color} strokeWidth="3" />
      <line x1="26" y1="46" x2="22" y2="56" stroke={color} strokeWidth="2" />
      <line x1="38" y1="46" x2="42" y2="56" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// Disney Lorcana — Magic star / inkwell
export function LorcanaIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
      {/* 6-point star */}
      <path d="M32 4l5 12 12-5-5 12 12 5-12 5 5 12-12-5-5 12-5-12-12 5 5-12-12-5 12-5-5-12 12 5z" />
      <circle cx="32" cy="32" r="6" fill="none" stroke={color} strokeWidth="0" />
    </svg>
  );
}

// One Piece — Straw Hat (Mugiwara)
export function OnePieceIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Hat brim */}
      <ellipse cx="32" cy="38" rx="26" ry="8" fill={color} opacity="0.2" />
      <ellipse cx="32" cy="38" rx="26" ry="8" />
      {/* Hat dome */}
      <path d="M16 38C16 38 18 16 32 16s16 22 16 22" fill={color} opacity="0.15" />
      <path d="M16 38C16 38 18 16 32 16s16 22 16 22" />
      {/* Hat band */}
      <path d="M18 34h28" strokeWidth="4" stroke={color} />
    </svg>
  );
}

// Flesh and Blood — Crossed swords
export function FaBIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Sword 1 */}
      <line x1="12" y1="52" x2="48" y2="12" />
      <line x1="44" y1="12" x2="52" y2="12" />
      <line x1="48" y1="8" x2="48" y2="16" />
      <line x1="22" y1="38" x2="28" y2="44" strokeWidth="4" />
      {/* Sword 2 */}
      <line x1="52" y1="52" x2="16" y2="12" />
      <line x1="12" y1="12" x2="20" y2="12" />
      <line x1="16" y1="8" x2="16" y2="16" />
      <line x1="36" y1="38" x2="42" y2="44" strokeWidth="4" />
    </svg>
  );
}

// Weiss Schwarz — Star burst
export function WeissIcon({ className = "h-8 w-8", color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 2l4 14 14-4-10 10 14 4-14 4 10 10-14-4-4 14-4-14-14 4 10-10-14-4 14-4-10-10 14 4z" />
    </svg>
  );
}

// Map of TCG id to icon component
const TCG_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  magic: MagicIcon,
  pokemon: PokemonIcon,
  yugioh: YugiohIcon,
  lorcana: LorcanaIcon,
  onepiece: OnePieceIcon,
  "flesh-and-blood": FaBIcon,
  "weiss-schwarz": WeissIcon,
};

export function TCGIcon({ tcgId, ...props }: IconProps & { tcgId: string }) {
  const Icon = TCG_ICON_MAP[tcgId];
  if (!Icon) return null;
  return <Icon {...props} />;
}
