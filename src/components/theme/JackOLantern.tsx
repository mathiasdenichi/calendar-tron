interface JackOLanternProps {
  /** Body color. */
  color?: string;
  /** Color the carved face is cut through to. */
  faceColor?: string;
  /** Carved face is dropped at small sizes, where it turns to mush. */
  showFace?: boolean;
  className?: string;
}

/**
 * Pumpkin drawn on a 0 0 64 64 grid so it can be dropped into any viewBox.
 * Returns a bare <g>, not an <svg>, so callers control sizing.
 */
export function JackOLanternShape({
  color = "#ff9933",
  faceColor = "#0b0b0f",
  showFace = true,
  className = "",
}: JackOLanternProps) {
  return (
    <g className={className}>
      {/* stem + curl */}
      <path
        d="M30 14c0-5 1-9 4-11 2 3 0 5-1 7 2-1 4-1 5 1-2 1-4 2-5 4z"
        fill="#5f8b3a"
      />
      {/* ribbed body: outer lobes sit behind a wider centre lobe */}
      <ellipse cx="17" cy="40" rx="13" ry="21" fill={color} opacity="0.72" />
      <ellipse cx="47" cy="40" rx="13" ry="21" fill={color} opacity="0.72" />
      <ellipse cx="32" cy="40" rx="26" ry="22" fill={color} />

      {showFace && (
        <>
          {/* triangular eyes */}
          <path d="M18.5 32 L29.5 32 L24 41 Z" fill={faceColor} />
          <path d="M45.5 32 L34.5 32 L40 41 Z" fill={faceColor} />
          {/* nose */}
          <path d="M32 37 L36 44 L28 44 Z" fill={faceColor} />
          {/* jagged grin */}
          <path
            d="M15 47 L21.5 45.5 L25 50 L29 45.5 L32.5 50 L36 45.5 L40 50 L43.5 45.5 L49 47
               L45 54 L39 52 L32 55.5 L25 52 L19 54 Z"
            fill={faceColor}
          />
        </>
      )}
    </g>
  );
}

interface JackOLanternIconProps extends Omit<JackOLanternProps, "className"> {
  size?: number;
  className?: string;
}

/**
 * Standalone <svg> wrapper for use outside an existing SVG.
 *
 * className lands on the <svg>, not the inner <g> — positioning classes on the
 * group do nothing, which silently breaks absolute layout.
 */
export function JackOLantern({ size = 28, className = "", ...shape }: JackOLanternIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <JackOLanternShape {...shape} />
    </svg>
  );
}

/**
 * The pumpkin body is centred at 40/64 rather than the middle of the viewBox
 * (the stem occupies the top), so anything overlaid on the body needs nudging
 * down by this fraction of the rendered size.
 */
export const PUMPKIN_BODY_OFFSET = 0.125;
