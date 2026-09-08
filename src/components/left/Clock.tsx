import { useClock } from "../../hooks/useClock";

export function Clock() {
  const { formatted, dateLine, tzName } = useClock();

  const [time, period] = formatted.split(" ");

  return (
    <div className="select-none">
      <div className="flex items-end gap-3">
        <span
          className="font-thin tracking-tighter drop-shadow-lg text-4xl lg:text-[5.5rem] leading-none"
          style={{ color: "var(--cal-time)" }}
        >
          {time}
        </span>
        {/* color-mix rather than opacity so the themed color keeps the same
            alpha tiers the original white/80 and white/60 had. */}
        <span
          className="font-light mb-0.5 lg:mb-2 text-base lg:text-3xl drop-shadow"
          style={{ color: "color-mix(in srgb, var(--cal-time) 80%, transparent)" }}
        >
          {period}
        </span>
        <span
          className="font-light mb-0.5 lg:mb-2 text-sm lg:text-2xl drop-shadow"
          style={{ color: "color-mix(in srgb, var(--cal-time) 60%, transparent)" }}
        >
          {tzName}
        </span>
      </div>
      <div className="text-white/70 font-light text-xs lg:text-lg tracking-wide drop-shadow mt-0.5 lg:mt-1">
        {dateLine}
      </div>
    </div>
  );
}
