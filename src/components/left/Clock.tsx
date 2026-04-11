import { useClock } from "../../hooks/useClock";

export function Clock() {
  const { formatted, dateLine, tzName } = useClock();

  const [time, period] = formatted.split(" ");

  return (
    <div className="select-none">
      <div className="flex items-end gap-3">
        <span className="font-thin tracking-tighter text-white drop-shadow-lg" style={{ fontSize: "5.5rem", lineHeight: 1 }}>
          {time}
        </span>
        <span className="text-white/80 font-light mb-2 text-3xl drop-shadow">{period}</span>
        <span className="text-white/60 font-light mb-2 text-2xl drop-shadow">{tzName}</span>
      </div>
      <div className="text-white/70 font-light text-lg tracking-wide drop-shadow mt-1">
        {dateLine}
      </div>
    </div>
  );
}
