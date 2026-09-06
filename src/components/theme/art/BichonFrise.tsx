interface BichonFriseProps {
  coat?: string;
  ear?: string;
  featureColor?: string;
}

/**
 * Bare <g> on a 0 0 64 64 grid. The coat is built from overlapping puffs, which
 * is also why it works as a stand-in for a cloud.
 */
export function BichonFriseShape({
  coat = "#ffffff",
  ear = "#efe7dc",
  featureColor = "#2b2622",
}: BichonFriseProps) {
  return (
    <g>
      {/* ears sit behind the face fluff */}
      <ellipse cx="11" cy="38" rx="8" ry="12" fill={ear} />
      <ellipse cx="53" cy="38" rx="8" ry="12" fill={ear} />

      {/* fluffy head: a ring of puffs under one solid centre */}
      <g fill={coat}>
        <circle cx="32" cy="17" r="11" />
        <circle cx="17" cy="24" r="10" />
        <circle cx="47" cy="24" r="10" />
        <circle cx="14" cy="38" r="9.5" />
        <circle cx="50" cy="38" r="9.5" />
        <circle cx="22" cy="48" r="9.5" />
        <circle cx="42" cy="48" r="9.5" />
        <circle cx="32" cy="36" r="20" />
      </g>

      {/* face */}
      <circle cx="24" cy="33" r="3" fill={featureColor} />
      <circle cx="40" cy="33" r="3" fill={featureColor} />
      <ellipse cx="32" cy="41" rx="4" ry="3.1" fill={featureColor} />
      <path
        d="M32 44.5 q-4 4 -7.5 1 M32 44.5 q4 4 7.5 1"
        stroke={featureColor}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}
