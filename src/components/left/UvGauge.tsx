import { uvLevel } from "../../lib/uvIndex";

interface UvGaugeProps {
  index: number;
}

// Fixed geometry; the rendered size comes from CSS so it can scale with the
// rest of the panel without recomputing the arc.
const BOX = 76;
const STROKE = 7;
const RADIUS = (BOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function UvGauge({ index }: UvGaugeProps) {
  const { value, label, color, fraction } = uvLevel(index);
  const filled = CIRCUMFERENCE * fraction;

  return (
    <div className="flex flex-col items-center gap-1 select-none flex-shrink-0">
      <div className="relative w-[52px] h-[52px] lg:w-[76px] lg:h-[76px]">
        <svg
          viewBox={`0 0 ${BOX} ${BOX}`}
          className="w-full h-full -rotate-90"
          aria-label={`UV index ${value}, ${label}`}
        >
          <circle
            cx={BOX / 2}
            cy={BOX / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={STROKE}
          />
          <circle
            cx={BOX / 2}
            cy={BOX / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            style={{
              filter: `drop-shadow(0 0 5px ${color}66)`,
              transition: "stroke-dasharray 600ms ease-out, stroke 400ms ease-out",
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-white/60 text-[7px] lg:text-[9px] font-semibold tracking-[0.15em] drop-shadow">
            UV
          </span>
          <span
            className="text-white font-semibold text-base lg:text-2xl drop-shadow"
            style={{ lineHeight: 1 }}
          >
            {value}
          </span>
        </div>
      </div>

      <span
        className="text-[9px] lg:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
        style={{ color, textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}
      >
        {label}
      </span>
    </div>
  );
}
