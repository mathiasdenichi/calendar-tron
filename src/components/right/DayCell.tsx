import { useRef } from "react";
import { CalendarEvent, DatePhoto } from "../../types";

interface DayCellProps {
  date: Date | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  photos: DatePhoto[];
  onDoubleTap: (date: Date) => void;
}

export function DayCell({ date, isCurrentMonth, isToday, events, photos, onDoubleTap }: DayCellProps) {
  const lastTapRef = useRef<number>(0);

  if (!date) {
    return <div className="bg-transparent border border-gray-800/20 rounded-xl" />;
  }

  function handleTap() {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    if (delta < 400 && delta > 0) {
      onDoubleTap(date!);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  const icloudEvents = events.filter((e) => e.source === "icloud");
  const localEvents = events.filter((e) => e.source === "local");

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <div
      className={`relative border rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all duration-150 select-none
        ${isToday
          ? "border-blue-500/70 bg-blue-950/30"
          : isCurrentMonth
          ? "border-gray-700/40 bg-gray-800/20 hover:bg-gray-700/30"
          : "border-gray-800/20 bg-gray-900/10 opacity-40"
        }
      `}
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      <div className={`flex items-center justify-between px-2 pt-1.5 pb-0.5 ${isToday ? "" : ""}`}>
        <span
          className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
            ${isToday ? "bg-blue-500 text-white" : isCurrentMonth ? "text-gray-200" : "text-gray-600"}
          `}
        >
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {photos.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" title={`${photos.length} photo(s)`} />
          )}
          {localEvents.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          )}
        </div>
      </div>

      <div className="flex-1 px-1.5 pb-1.5 space-y-0.5 overflow-hidden">
        {events.slice(0, 4).map((event) => (
          <div
            key={event.id}
            className={`text-xs px-1.5 py-0.5 rounded truncate font-medium leading-tight
              ${event.source === "icloud"
                ? "bg-blue-600/30 text-blue-200 border border-blue-600/20"
                : "bg-emerald-600/30 text-emerald-200 border border-emerald-600/20"
              }
            `}
          >
            <span className="block truncate">{formatTime(event.startTime)} {event.title}</span>
          </div>
        ))}
        {events.length > 4 && (
          <div className="text-xs text-gray-500 px-1.5">+{events.length - 4} more</div>
        )}
      </div>

      {photos.length > 0 && (
        <div
          className="absolute bottom-0 right-0 w-10 h-10 rounded-tl-lg overflow-hidden border-t border-l border-gray-700/40"
        >
          <img
            src={photos[photos.length - 1].photo_url}
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
        </div>
      )}
    </div>
  );
}
