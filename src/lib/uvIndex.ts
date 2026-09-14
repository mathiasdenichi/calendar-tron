export interface UvLevel {
  /** Rounded index, the way UV is conventionally reported. */
  value: number;
  label: string;
  color: string;
  /** 0-1 position around the gauge ring. */
  fraction: number;
}

/** The scale is open-ended; 11+ is "Extreme", so the ring fills there. */
export const UV_SCALE_MAX = 11;

const BANDS: Array<{ max: number; label: string; color: string }> = [
  { max: 2, label: "Low", color: "#4ade80" },
  { max: 5, label: "Moderate", color: "#facc15" },
  { max: 7, label: "High", color: "#fb923c" },
  { max: 10, label: "Very High", color: "#f87171" },
  { max: Infinity, label: "Extreme", color: "#c084fc" },
];

/**
 * WHO bands, classified from the ROUNDED value so the number shown and the risk
 * word can never disagree - a raw 5.6 displayed as "6" must read "High".
 */
export function uvLevel(raw: number): UvLevel {
  const safe = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  const value = Math.round(safe);
  const band = BANDS.find((b) => value <= b.max) ?? BANDS[BANDS.length - 1];

  return {
    value,
    label: band.label,
    color: band.color,
    fraction: Math.min(value / UV_SCALE_MAX, 1),
  };
}
