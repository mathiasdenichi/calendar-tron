import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { EventModal } from "./EventModal";
import { useCalendar } from "../../hooks/useCalendar";
import { CalendarEvent, DatePhoto } from "../../types";

export function RightPanel() {
  const {
    eventsByDate,
    photosByDate,
    loading,
    addEvent,
    deleteEvent,
    addDatePhoto,
    addDatePhotoFromGallery,
    deleteDatePhoto,
    loadGalleryPhotos,
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function handleDayDoubleTap(date: Date) {
    setSelectedDate(date);
  }

  function getDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const selectedEvents: CalendarEvent[] = selectedDate ? eventsByDate[getDateStr(selectedDate)] || [] : [];
  const selectedPhotos: DatePhoto[] = selectedDate ? photosByDate[getDateStr(selectedDate)] || [] : [];

  return (
    <div className="w-full h-full bg-gray-950 flex flex-col p-6 overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-lg">Loading calendar...</div>
        </div>
      ) : (
        <CalendarGrid
          eventsByDate={eventsByDate}
          photosByDate={photosByDate}
          onDayDoubleTap={handleDayDoubleTap}
        />
      )}

      {selectedDate && (
        <EventModal
          date={selectedDate}
          events={selectedEvents}
          photos={selectedPhotos}
          onClose={() => setSelectedDate(null)}
          onAddEvent={addEvent}
          onDeleteEvent={deleteEvent}
          onUploadPhoto={addDatePhoto}
          onAddPhotoFromGallery={addDatePhotoFromGallery}
          onDeletePhoto={deleteDatePhoto}
          onLoadGallery={loadGalleryPhotos}
        />
      )}
    </div>
  );
}
