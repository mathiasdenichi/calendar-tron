interface KittyHeadProps {
  color?: string;
  innerEar?: string;
  featureColor?: string;
  /** Face is dropped when a day number is overlaid — they fight otherwise. */
  showFace?: boolean;
  size?: number;
  className?: string;
}

/** Bare <g> on a 0 0 64 64 grid. */
export function KittyHeadShape({
  color = "#c084fc",
  innerEar = "#f7d6e8",
  featureColor = "#2a1b3d",
  showFace = true,
}: KittyHeadProps) {
  return (
    <g>
      {/* ears */}
      <path d="M13 26 L15 6 L32 17 Z" fill={color} />
      <path d="M51 26 L49 6 L32 17 Z" fill={color} />
      <path d="M18 23 L19.5 12 L28 18 Z" fill={innerEar} />
      <path d="M46 23 L44.5 12 L36 18 Z" fill={innerEar} />

      {/* head */}
      <ellipse cx="32" cy="36" rx="22" ry="19" fill={color} />

      {showFace && (
        <>
      {/* eyes */}
      <ellipse cx="23" cy="34" rx="3.2" ry="4.4" fill={featureColor} />
      <ellipse cx="41" cy="34" rx="3.2" ry="4.4" fill={featureColor} />

      {/* nose + mouth */}
      <path d="M32 40 L35 43.5 L29 43.5 Z" fill={innerEar} />
      <path
        d="M32 44 q-3.5 4 -7 1.5 M32 44 q3.5 4 7 1.5"
        stroke={featureColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* whiskers */}
      <g stroke={featureColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
        <line x1="14" y1="38" x2="3" y2="35" />
        <line x1="14" y1="42" x2="3.5" y2="43" />
        <line x1="50" y1="38" x2="61" y2="35" />
        <line x1="50" y1="42" x2="60.5" y2="43" />
      </g>
        </>
      )}
    </g>
  );
}

export function KittyHead({ size = 28, className = "", ...shape }: KittyHeadProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <KittyHeadShape {...shape} />
    </svg>
  );
}

/** Head centre sits below the glyph centre because the ears occupy the top. */
export const KITTY_FACE_OFFSET = 0.06;
