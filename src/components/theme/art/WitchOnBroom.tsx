interface WitchOnBroomProps {
  purple?: string;
  black?: string;
  glow?: string;
}

/**
 * Bare <g> on the weather icons' 0 0 80 80 grid: a witch crossing a bank of
 * glowing green cloud. The glow is layered translucent fills rather than an SVG
 * filter — filters need document-unique ids, and this renders many times.
 */
export function WitchOnBroomShape({
  purple = "#a855f7",
  black = "#17101f",
  glow = "#4dff9e",
}: WitchOnBroomProps) {
  return (
    <g>
      {/* glowing cloud bank: soft halo, then distinct puffs over a flat base so
          it reads as cloud rather than a blob */}
      <g fill={glow}>
        <ellipse cx="40" cy="59" rx="31" ry="14" opacity="0.13" />
        <ellipse cx="40" cy="59" rx="24" ry="10.5" opacity="0.2" />
        <g opacity="0.95">
          <circle cx="27" cy="57" r="9" />
          <circle cx="40" cy="52.5" r="11" />
          <circle cx="53" cy="58" r="8.5" />
          <rect x="18" y="57" width="44" height="10.5" rx="5.25" />
        </g>
        {/* top-lit highlight */}
        <g opacity="0.45" fill="#dcffee">
          <circle cx="38" cy="50" r="6" />
          <circle cx="27" cy="55" r="4.2" />
        </g>
      </g>

      {/* rider group, scaled up slightly around her centre for small sizes */}
      <g transform="translate(40 26) scale(1.12) translate(-40 -26)">
      {/* broomstick, tilted so she climbs to the right */}
      <g transform="rotate(-20 40 34)">
        <rect x="12" y="33" width="52" height="2.8" rx="1.4" fill="#6b4a2a" />
        <path d="M15 34.4 L1 26 L3.5 34.4 L1 43 Z" fill="#c98a3c" />
        <path d="M15 34.4 L6 30 L7.5 34.4 L6 39 Z" fill="#e8b463" />
      </g>

      {/* cloak streaming behind */}
      <path d="M35 27 q-13 4 -21 -3 q11 5 20 -2 z" fill={black} />
      <path d="M34 30 q-11 4 -17 -1 q9 4 16 -2 z" fill={purple} opacity="0.55" />

      {/* seated body */}
      <path d="M32 32 q1 -13 9 -16 q8 -2 8 7 q0 9 -7 11 z" fill={black} />
      <path d="M35 31 q2 -10 8 -12 q5 -1 5 5 q0 7 -5 8 z" fill={purple} opacity="0.9" />

      {/* trailing leg */}
      <path d="M41 31 q6 3 7 7" stroke={black} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      {/* arm reaching to the shaft */}
      <path d="M44 21 q6 3 8 8" stroke={black} strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* head + hat */}
      <circle cx="46" cy="15.5" r="4.3" fill="#d9c3e8" />
      <path d="M40.5 13 L56 0.5 L57 13 Z" fill={purple} />
      <ellipse cx="47.5" cy="13.2" rx="9.8" ry="2.7" fill={black} />
      <rect x="44" y="9.2" width="8.5" height="2.3" rx="0.6" fill={black} transform="rotate(-40 48 10)" />
      </g>
    </g>
  );
}
