/**
 * Bare <g> on the same 0 0 64 64 grid as BichonFriseShape, sized to sit on its
 * head. Drawn as its own layer rather than a BichonFrise prop, so the Gingey
 * bichon is untouched. The cone rises above y=0: give it headroom in the
 * containing viewBox.
 */
export function SantaHatShape() {
  return (
    <g>
      {/* cone, flopping over to the right */}
      <path d="M14 14 C17 -2 33 -10 45 -7 C52 -5 56 1 57 8 L50 14 Z" fill="#d62828" />
      {/* shading on the fold */}
      <path d="M45 -7 C52 -5 56 1 57 8 L52 10 C51 3 49 -2 45 -7 Z" fill="#a61e1e" />
      {/* fur brim - edged so it reads against the white coat */}
      <rect x="11" y="10" width="42" height="9" rx="4.5" fill="#ffffff" stroke="#d6d6d6" strokeWidth="1" />
      {/* pom-pom */}
      <circle cx="57" cy="9" r="4.5" fill="#ffffff" stroke="#d6d6d6" strokeWidth="1" />
    </g>
  );
}
