import { useRef } from "react"
import { CalendarEvent, DatePhoto } from "../../types"

interface DayCellProps {
  date: Date | null
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  photos: DatePhoto[]
  onDoubleTap: (date: Date) => void
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  photos,
  onDoubleTap,
}: DayCellProps) {
  const lastTapRef = useRef<number>(0)

  if (!date) {
    return (
      <div className="bg-transparent border border-gray-800/20 rounded-xl" />
    )
  }

  function handleTap() {
    const now = Date.now()
    const delta = now - lastTapRef.current
    if (delta < 400 && delta > 0) {
      onDoubleTap(date!)
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }

  const localEvents = events.filter((e) => e.source === "local")

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const hasPhoto = photos.length > 0

  return (
    <div
      className={`relative border rounded-xl flex flex-col overflow-hidden cursor-pointer transition-all duration-150 select-none
        ${
          isToday
            ? "border-blue-500/70"
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
              ? "bg-blue-950/30"
              : isCurrentMonth
                ? "bg-gray-800/20"
                : "bg-gray-900/10"
          }`}
        />
      )}

      <div className="relative flex items-center justify-between px-2 pt-1.5 pb-0.5">
        <span
          className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
            ${
              isToday
                ? "bg-blue-500 text-white"
                : hasPhoto
                  ? "text-white drop-shadow"
                  : isCurrentMonth
                    ? "text-gray-200"
                    : "text-gray-600"
            }
          `}
        >
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {localEvents.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          )}
        </div>
      </div>

      <div className="relative flex-1 px-1.5 pb-1.5 space-y-0.5 overflow-hidden">
        {events.slice(0, 4).map((event) => (
          <div
            key={event.id}
            className={`text-xs px-1.5 py-0.5 rounded truncate font-medium leading-tight
              ${
                event.source === "icloud"
                  ? "bg-blue-600/40 text-blue-100 border border-blue-500/30"
                  : "bg-emerald-600/40 text-emerald-100 border border-emerald-500/30"
              }
            `}
          >
            <span className="block truncate">
              {formatTime(event.startTime)} {event.title}
            </span>
          </div>
        ))}
        {events.length > 4 && (
          <div
            className={`text-xs px-1.5 ${hasPhoto ? "text-white/60" : "text-gray-500"}`}
          >
            +{events.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}
