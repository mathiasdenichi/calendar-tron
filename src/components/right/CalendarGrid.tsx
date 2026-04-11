import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarEvent, DatePhoto } from "../../types";
import { DayCell } from "./DayCell";

interface CalendarGridProps {
  eventsByDate: Record<string, CalendarEvent[]>;
  photosByDate: Record<string, DatePhoto[]>;
  onDayDoubleTap: (date: Date) => void;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({ eventsByDate, photosByDate, onDayDoubleTap }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(new Date(year, month - 1, daysInPrevMonth - firstDay + 1 + i));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }
  while (cells.length < totalCells) {
    cells.push(new Date(year, month + 1, cells.length - firstDay - daysInMonth + 1));
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function toDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setViewDate(new Date());
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-2xl tracking-tight">{monthLabel}</h2>
          <button
            onClick={goToday}
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/40 hover:border-blue-400 px-3 py-1 rounded-full transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex-1 grid grid-cols-7 gap-1">
            {week.map((date, di) => {
              if (!date) return <div key={di} />;
              const ds = toDateStr(date);
              const isCurrentMonth = date.getMonth() === month;
              const isToday = ds === todayStr;
              const events = eventsByDate[ds] || [];
              const photos = photosByDate[ds] || [];
              return (
                <DayCell
                  key={ds + "-" + di}
                  date={isCurrentMonth ? date : date}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  events={events}
                  photos={photos}
                  onDoubleTap={onDayDoubleTap}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-400/40" />
          <span className="text-gray-500 text-xs">Holidays</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-600/50 border border-blue-600/40" />
          <span className="text-gray-500 text-xs">iCloud</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600/50 border border-emerald-600/40" />
          <span className="text-gray-500 text-xs">Local</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400/80" />
          <span className="text-gray-500 text-xs">Photos</span>
        </div>
        <span className="text-gray-600 text-xs ml-auto">Double-tap a day to add events or photos</span>
      </div>
    </div>
  );
}
