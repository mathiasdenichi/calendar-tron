interface TurkeyProps {
  size?: number;
  className?: string;
}

// Tail fan, back to front: rust, burnt orange, gold, repeating outward.
// Capped at 60deg: wider, the outer feathers cross the 64-unit box and are
// clipped flat at the sides.
const FEATHER_ANGLES = [-60, -40, -20, 0, 20, 40, 60];
const FEATHER_COLORS = ["#8a3b1c", "#c4561f", "#e09a2d", "#c4561f", "#e09a2d", "#c4561f", "#8a3b1c"];

/**
 * How far the body's centre sits below the grid centre, as a fraction of the
 * rendered size. A day number over today's turkey is nudged down by this so it
 * lands on the body rather than the neck.
 */
export const TURKEY_BODY_OFFSET = (43 - 32) / 64;

/** Bare <g> on a 0 0 64 64 grid, for dropping into an existing viewBox. */
export function TurkeyShape() {
  return (
    <g>
      {/* tail fan: each feather is the same ellipse swung around the body */}
      {FEATHER_ANGLES.map((angle, i) => (
        <ellipse
          key={angle}
          cx="32"
          cy="23"
          rx="7"
          ry="15"
          fill={FEATHER_COLORS[i]}
          transform={`rotate(${angle} 32 43)`}
        />
      ))}
      {/* a lighter inner ring gives the fan some depth */}
      {FEATHER_ANGLES.slice(1, -1).map((angle) => (
        <ellipse
          key={`inner${angle}`}
          cx="32"
          cy="29"
          rx="4.5"
          ry="10"
          fill="#f2c14e"
          transform={`rotate(${angle} 32 43)`}
        />
      ))}

      {/* feet */}
      <g stroke="#e8862e" strokeWidth="2.2" strokeLinecap="round">
        <path d="M27 54 v5 M27 59 l-3 2 M27 59 l3 2" />
        <path d="M37 54 v5 M37 59 l-3 2 M37 59 l3 2" />
      </g>

      {/* body */}
      <ellipse cx="32" cy="43" rx="14" ry="13" fill="#6b3e1f" />
      <ellipse cx="32" cy="46" rx="9" ry="8" fill="#7d4a26" />

      {/* head and neck */}
      <ellipse cx="32" cy="29" rx="6.5" ry="8" fill="#8b5a33" />
      <circle cx="29.5" cy="26.5" r="1.4" fill="#1a0f06" />
      <circle cx="34.5" cy="26.5" r="1.4" fill="#1a0f06" />
      {/* beak */}
      <path d="M30 29.5 L34 29.5 L32 33 Z" fill="#f2a93b" />
      {/* wattle */}
      <path d="M32.6 31.5 q3 2 1.6 6.5 q-2.6 -1 -2.6 -4.5 z" fill="#d1312b" />
    </g>
  );
}

export function Turkey({ size = 28, className = "" }: TurkeyProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <TurkeyShape />
    </svg>
  );
}
