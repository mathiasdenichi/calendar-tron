import { useRef } from "react";
import { CalendarEvent, DatePhoto } from "../../types";
import { useDecor } from "../../hooks/useTheme";
import { JackOLantern, PUMPKIN_BODY_OFFSET } from "../theme/JackOLantern";

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
  const spooky = useDecor() === "halloween";

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

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const hasPhoto = photos.length > 0;
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  const sortedEvents = [...allDayEvents, ...timedEvents];
  const localEvents = events.filter((e) => e.source === "local");

  return (
    <div
      className={`relative border rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all duration-150 select-none
        ${isToday
          ? spooky ? "border-[color:var(--cal-event)]" : "border-blue-500/70"
          : isCurrentMonth
          ? "border-gray-700/40 hover:border-gray-600/60"
          : "border-gray-800/20 opacity-40"
        }
      `}
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      {hasPhoto && (
        <img
          src={photos[photos.length - 1].photo_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {hasPhoto && <div className="absolute inset-0 bg-black/50" />}

      {!hasPhoto && (
        <div
          className={`absolute inset-0 ${
            isToday
              ? spooky ? "" : "bg-blue-950/30"
              : isCurrentMonth ? "bg-gray-800/20" : "bg-gray-900/10"
          }`}
          style={
            isToday && spooky
              ? { backgroundColor: "color-mix(in srgb, var(--cal-event) 12%, transparent)" }
              : undefined
          }
        />
      )}

      <div className="relative flex items-center justify-between px-2 pt-1.5 pb-0.5">
        {isToday && spooky ? (
          // Today's marker becomes a jack-o'-lantern. The face is dropped at
          // this size — the day number sits where it would be.
          <span className="relative w-7 h-7 flex items-center justify-center">
            <JackOLantern size={28} showFace={false} className="absolute inset-0" />
            <span
              className="relative text-xs font-bold text-black leading-none"
              style={{ transform: `translateY(${28 * PUMPKIN_BODY_OFFSET}px)` }}
            >
              {date.getDate()}
            </span>
          </span>
        ) : (
          <span
            className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
              ${isToday ? "bg-blue-500 text-white" : hasPhoto ? "drop-shadow" : ""}
              ${!isToday && !hasPhoto && !isCurrentMonth ? "opacity-40" : ""}
            `}
            // Today keeps its solid blue chip; every other day number follows the
            // themed date color, dimmed when it belongs to an adjacent month.
            style={isToday ? undefined : { color: hasPhoto ? "#ffffff" : "var(--cal-date)" }}
          >
            {date.getDate()}
          </span>
        )}
        <div className="flex items-center gap-1">
          {localEvents.length > 0 && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "color-mix(in srgb, var(--cal-event) 80%, transparent)" }}
            />
          )}
        </div>
      </div>

      <div className="relative flex-1 px-1.5 pb-1.5 space-y-0.5 overflow-hidden">
        {sortedEvents.slice(0, 4).map((event) => {
          if (event.allDay) {
            const isHoliday = event.source === "holiday";
            return (
              <div
                key={event.id}
                className={`text-xs px-1.5 py-0.5 rounded truncate font-bold leading-tight ${
                  isHoliday
                    ? "bg-amber-500/30 text-amber-200 border border-amber-400/40"
                    : "bg-fuchsia-600/70 text-white border border-fuchsia-400/40"
                }`}
              >
                <span className="block truncate">{event.title}</span>
              </div>
            );
          }
          const isICloud = event.source === "icloud";
          return (
            <div
              key={event.id}
              className={`text-xs px-1.5 py-0.5 rounded truncate font-medium leading-tight border
                ${isICloud ? "bg-blue-600/40 text-blue-100 border-blue-500/30" : ""}
              `}
              // Local events are the ones the user owns, so they follow the
              // themed event color. iCloud and holidays keep fixed colors so
              // the legend below the grid still tells them apart.
              style={
                isICloud
                  ? undefined
                  : {
                      backgroundColor: "color-mix(in srgb, var(--cal-event) 40%, transparent)",
                      borderColor: "color-mix(in srgb, var(--cal-event) 55%, transparent)",
                      color: "color-mix(in srgb, var(--cal-event) 30%, white)",
                    }
              }
            >
              <span className="block truncate">{formatTime(event.startTime)} {event.title}</span>
            </div>
          );
        })}
        {sortedEvents.length > 4 && (
          <div
            className="text-xs px-1.5"
            style={{ color: hasPhoto ? "rgba(255,255,255,0.6)" : "var(--cal-subtext)" }}
          >
            +{sortedEvents.length - 4} more
          </div>
        )}
      </div>
    </div>
  );
}
