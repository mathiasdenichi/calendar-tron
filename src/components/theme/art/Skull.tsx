interface SkullProps {
  color?: string;
  hollowColor?: string;
  size?: number;
  className?: string;
}

/** Bare <g> on a 0 0 64 64 grid, for dropping into an existing viewBox. */
export function SkullShape({ color = "#d8d2c6", hollowColor = "#0a0a0c" }: SkullProps) {
  return (
    <g>
      {/* cranium */}
      <ellipse cx="32" cy="28" rx="19" ry="18" fill={color} />
      {/* cheekbones */}
      <ellipse cx="20" cy="38" rx="6" ry="7" fill={color} />
      <ellipse cx="44" cy="38" rx="6" ry="7" fill={color} />
      {/* jaw */}
      <path d="M22 40 h20 v7 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 z" fill={color} />

      {/* eye sockets */}
      <ellipse cx="24" cy="27" rx="6.6" ry="7.4" fill={hollowColor} />
      <ellipse cx="40" cy="27" rx="6.6" ry="7.4" fill={hollowColor} />
      {/* nasal cavity */}
      <path d="M32 33 L35.6 40 L28.4 40 Z" fill={hollowColor} />
      {/* teeth */}
      <g stroke={hollowColor} strokeWidth="1.6">
        <line x1="27" y1="41" x2="27" y2="50" />
        <line x1="32" y1="41" x2="32" y2="51" />
        <line x1="37" y1="41" x2="37" y2="50" />
      </g>
    </g>
  );
}

export function Skull({ size = 28, className = "", ...shape }: SkullProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <SkullShape {...shape} />
    </svg>
  );
}
