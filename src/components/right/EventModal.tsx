import { useState, useCallback, useEffect } from "react";
import { X, Clock, Trash2, Plus, Upload, Check, Images, Pencil } from "lucide-react";
import { CalendarEvent, DatePhoto } from "../../types";
import { SlideshowPhoto } from "../../hooks/useICloudPhotos";

interface EventModalProps {
  date: Date;
  events: CalendarEvent[];
  photos: DatePhoto[];
  onClose: () => void;
  onAddEvent: (data: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    date: string;
    allDay: boolean;
  }) => Promise<{ error: unknown }>;
  onUpdateEvent: (id: string, data: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    date: string;
    allDay: boolean;
  }) => Promise<{ error: unknown }>;
  onDeleteEvent: (id: string) => void;
  onUploadPhoto: (date: string, file: File) => Promise<{ error: unknown }>;
  onAddPhotoFromGallery: (date: string, photo: SlideshowPhoto) => Promise<{ error: unknown }>;
  onDeletePhoto: (id: string, url: string) => void;
  onLoadGallery: (offset?: number) => Promise<{ photos: SlideshowPhoto[]; hasMore: boolean }>;
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { label: String(h), value: String(h).padStart(2, "0") };
});
const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const AMPM_OPTIONS = ["AM", "PM"];

function to24(hour: string, ampm: string): number {
  let h = parseInt(hour);
  if (ampm === "AM" && h === 12) h = 0;
  if (ampm === "PM" && h !== 12) h += 12;
  return h;
}

function from24(h: number): { hour: string; ampm: string } {
  if (h === 0) return { hour: "12", ampm: "AM" };
  if (h < 12) return { hour: String(h).padStart(2, "0"), ampm: "AM" };
  if (h === 12) return { hour: "12", ampm: "PM" };
  return { hour: String(h - 12).padStart(2, "0"), ampm: "PM" };
}

export function EventModal({
  date,
  events,
  photos,
  onClose,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onUploadPhoto,
  onAddPhotoFromGallery,
  onDeletePhoto,
  onLoadGallery,
}: EventModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startHour, setStartHour] = useState("09");
  const [startMin, setStartMin] = useState("00");
  const [startAmpm, setStartAmpm] = useState("AM");
  const [endHour, setEndHour] = useState("10");
  const [endMin, setEndMin] = useState("00");
  const [endAmpm, setEndAmpm] = useState("AM");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editStartHour, setEditStartHour] = useState("09");
  const [editStartMin, setEditStartMin] = useState("00");
  const [editStartAmpm, setEditStartAmpm] = useState("AM");
  const [editEndHour, setEditEndHour] = useState("10");
  const [editEndMin, setEditEndMin] = useState("00");
  const [editEndAmpm, setEditEndAmpm] = useState("AM");
  const [editSaving, setEditSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "photos">("events");

  const [galleryPhotos, setGalleryPhotos] = useState<SlideshowPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryLoadingMore, setGalleryLoadingMore] = useState(false);
  const [galleryHasMore, setGalleryHasMore] = useState(false);
  const [galleryOffset, setGalleryOffset] = useState(0);
  const [selectedGalleryGuid, setSelectedGalleryGuid] = useState<string | null>(null);
  const [addingFromGallery, setAddingFromGallery] = useState(false);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const displayDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hasPhoto = photos.length > 0;
  const currentPhoto = photos[0] ?? null;

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAllDay(false);
    setStartHour("09");
    setStartMin("00");
    setStartAmpm("AM");
    setEndHour("10");
    setEndMin("00");
    setEndAmpm("AM");
    setShowAddForm(false);
  }

  function startEditingEvent(event: CalendarEvent) {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description ?? "");
    setEditAllDay(event.allDay ?? false);
    if (event.allDay) {
      setEditStartHour("09");
      setEditStartMin("00");
      setEditStartAmpm("AM");
      setEditEndHour("10");
      setEditEndMin("00");
      setEditEndAmpm("AM");
    } else {
      const s = from24(event.startTime.getHours());
      const e = from24(event.endTime.getHours());
      setEditStartHour(s.hour);
      setEditStartAmpm(s.ampm);
      setEditStartMin(String(event.startTime.getMinutes()).padStart(2, "0"));
      setEditEndHour(e.hour);
      setEditEndAmpm(e.ampm);
      setEditEndMin(String(event.endTime.getMinutes()).padStart(2, "0"));
    }
  }

  async function handleUpdateSave() {
    if (!editingId || !editTitle.trim()) return;
    setEditSaving(true);
    const startTime = new Date(date);
    const endTime = new Date(date);
    if (editAllDay) {
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 0, 0);
    } else {
      startTime.setHours(to24(editStartHour, editStartAmpm), parseInt(editStartMin), 0, 0);
      endTime.setHours(to24(editEndHour, editEndAmpm), parseInt(editEndMin), 0, 0);
    }
    await onUpdateEvent(editingId, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      startTime,
      endTime,
      date: dateStr,
      allDay: editAllDay,
    });
    setEditingId(null);
    setEditSaving(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const startTime = new Date(date);
    const endTime = new Date(date);
    if (allDay) {
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 0, 0);
    } else {
      startTime.setHours(to24(startHour, startAmpm), parseInt(startMin), 0, 0);
      endTime.setHours(to24(endHour, endAmpm), parseInt(endMin), 0, 0);
    }
    await onAddEvent({
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      date: dateStr,
      allDay,
    });
    resetForm();
    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    await onUploadPhoto(dateStr, file);
    setUploadingPhoto(false);
    e.target.value = "";
  }

  const loadGalleryIfNeeded = useCallback(async () => {
    if (galleryPhotos.length === 0 && !galleryLoading) {
      setGalleryLoading(true);
      const result = await onLoadGallery(0);
      setGalleryPhotos(result.photos);
      setGalleryHasMore(result.hasMore);
      setGalleryOffset(result.photos.length);
      setGalleryLoading(false);
    }
  }, [galleryPhotos.length, galleryLoading, onLoadGallery]);

  useEffect(() => {
    if (activeTab === "photos") {
      loadGalleryIfNeeded();
    }
  }, [activeTab, loadGalleryIfNeeded]);

  const handleLoadMoreGallery = useCallback(async () => {
    setGalleryLoadingMore(true);
    const result = await onLoadGallery(galleryOffset);
    setGalleryPhotos((prev) => [...prev, ...result.photos]);
    setGalleryHasMore(result.hasMore);
    setGalleryOffset((prev) => prev + result.photos.length);
    setGalleryLoadingMore(false);
  }, [galleryOffset, onLoadGallery]);

  async function handleSelectFromGallery() {
    if (!selectedGalleryGuid) return;
    const photo = galleryPhotos.find((p) => p.guid === selectedGalleryGuid);
    if (!photo) return;
    setAddingFromGallery(true);
    await onAddPhotoFromGallery(dateStr, photo);
    setAddingFromGallery(false);
    setSelectedGalleryGuid(null);
  }

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  const sortedEvents = [...allDayEvents, ...timedEvents];

  const timeSelectClass = (disabled: boolean) =>
    `flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
      disabled
        ? "bg-gray-800/30 border-gray-700/30 text-gray-600 cursor-not-allowed"
        : "bg-gray-700/50 border-gray-600 text-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-[80vw] max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-white font-semibold text-lg">{displayDate}</h2>
            <p className="text-gray-400 text-sm">
              {events.length} event{events.length !== 1 ? "s" : ""} · {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-700/50">
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "events" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"}`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "photos" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"}`}
          >
            Photos
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 p-6">
          {activeTab === "events" && (
            <div className="overflow-y-auto flex-1 min-h-0">
            <div className="space-y-3">
              {sortedEvents.length === 0 && !showAddForm && (
                <p className="text-gray-500 text-sm text-center py-4">No events for this day</p>
              )}
              {sortedEvents.map((event) => (
                <div key={event.id}>
                  {editingId === event.id ? (
                    <div className="bg-gray-800/60 border border-blue-600/40 rounded-xl p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Event title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEditAllDay((v) => !v)}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all select-none ${
                          editAllDay
                            ? "border-fuchsia-500 bg-fuchsia-700/20"
                            : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${editAllDay ? "border-fuchsia-400 bg-fuchsia-500" : "border-gray-500 bg-transparent"}`}>
                          {editAllDay && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-sm font-medium ${editAllDay ? "text-fuchsia-200" : "text-gray-300"}`}>All Day Event</span>
                      </button>
                      <div className={`grid grid-cols-2 gap-3 transition-opacity ${editAllDay ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                        <div>
                          <label className="text-gray-400 text-xs mb-1 block">Start time</label>
                          <div className="flex gap-1">
                            <select value={editStartHour} onChange={(e) => setEditStartHour(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                            </select>
                            <span className={`self-center text-sm ${editAllDay ? "text-gray-600" : "text-gray-400"}`}>:</span>
                            <select value={editStartMin} onChange={(e) => setEditStartMin(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={editStartAmpm} onChange={(e) => setEditStartAmpm(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {AMPM_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-gray-400 text-xs mb-1 block">End time</label>
                          <div className="flex gap-1">
                            <select value={editEndHour} onChange={(e) => setEditEndHour(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                            </select>
                            <span className={`self-center text-sm ${editAllDay ? "text-gray-600" : "text-gray-400"}`}>:</span>
                            <select value={editEndMin} onChange={(e) => setEditEndMin(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={editEndAmpm} onChange={(e) => setEditEndAmpm(e.target.value)} disabled={editAllDay} className={timeSelectClass(editAllDay)}>
                              {AMPM_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateSave}
                          disabled={!editTitle.trim() || editSaving}
                          className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors font-medium"
                        >
                          {editSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        event.allDay
                          ? "bg-fuchsia-700/30 border-fuchsia-600/50"
                          : event.source === "icloud"
                          ? "bg-blue-950/40 border-blue-800/40"
                          : "bg-emerald-950/40 border-emerald-800/40"
                      }`}
                    >
                      <Clock
                        size={16}
                        className={`mt-0.5 shrink-0 ${
                          event.allDay ? "text-fuchsia-300" : event.source === "icloud" ? "text-blue-400" : "text-emerald-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{event.title}</p>
                        <p
                          className={`text-xs mt-0.5 ${
                            event.allDay
                              ? "text-fuchsia-300/80"
                              : event.source === "icloud"
                              ? "text-blue-400/70"
                              : "text-emerald-400/70"
                          }`}
                        >
                          {event.allDay ? "All Day" : `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`}
                        </p>
                        {event.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{event.description}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-1">{event.source === "icloud" ? "iCloud" : "Local"}</p>
                      </div>
                      {event.source === "local" && (
                        <div className="flex items-center gap-2 shrink-0 ml-1">
                          <button
                            onClick={() => startEditingEvent(event)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-gray-700/60 hover:bg-blue-600/30 text-gray-400 hover:text-blue-400 active:scale-95 transition-all"
                            title="Edit event"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteEvent(event.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-gray-700/60 hover:bg-red-600/30 text-red-500/70 hover:text-red-400 active:scale-95 transition-all"
                            title="Delete event"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {showAddForm && (
                <div className="bg-gray-800/60 border border-gray-600/40 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Event title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />

                  <button
                    type="button"
                    onClick={() => setAllDay((v) => !v)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all select-none ${
                      allDay
                        ? "border-fuchsia-500 bg-fuchsia-700/20"
                        : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        allDay ? "border-fuchsia-400 bg-fuchsia-500" : "border-gray-500 bg-transparent"
                      }`}
                    >
                      {allDay && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-medium ${allDay ? "text-fuchsia-200" : "text-gray-300"}`}>
                      All Day Event
                    </span>
                  </button>

                  <div className={`grid grid-cols-2 gap-3 transition-opacity ${allDay ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Start time</label>
                      <div className="flex gap-1">
                        <select value={startHour} onChange={(e) => setStartHour(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                        </select>
                        <span className={`self-center text-sm ${allDay ? "text-gray-600" : "text-gray-400"}`}>:</span>
                        <select value={startMin} onChange={(e) => setStartMin(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={startAmpm} onChange={(e) => setStartAmpm(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {AMPM_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">End time</label>
                      <div className="flex gap-1">
                        <select value={endHour} onChange={(e) => setEndHour(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                        </select>
                        <span className={`self-center text-sm ${allDay ? "text-gray-600" : "text-gray-400"}`}>:</span>
                        <select value={endMin} onChange={(e) => setEndMin(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={endAmpm} onChange={(e) => setEndAmpm(e.target.value)} disabled={allDay} className={timeSelectClass(allDay)}>
                          {AMPM_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!title.trim() || saving}
                      className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors font-medium"
                    >
                      {saving ? "Saving..." : "Save Event"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === "photos" && (
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="flex flex-col gap-4">
                {hasPhoto && currentPhoto ? (
                  <div className="relative group rounded-xl overflow-hidden bg-gray-800">
                    <img
                      src={currentPhoto.photo_url}
                      alt={currentPhoto.filename}
                      className="w-full object-cover max-h-48"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => onDeletePhoto(currentPhoto.id, currentPhoto.photo_url)}
                        className="text-red-400 hover:text-red-300 bg-black/50 rounded-lg p-2 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 text-xs text-white/70 bg-black/40 px-2 py-1 truncate">
                      {currentPhoto.filename}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-2">No photo assigned to this day</p>
                )}

                <div className="flex flex-col gap-3">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                    {hasPhoto ? "Replace photo" : "Add a photo"}
                  </p>

                  <label
                    className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      uploadingPhoto
                        ? "border-gray-600 text-gray-500 cursor-not-allowed"
                        : "border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400"
                    }`}
                  >
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                    <Upload size={16} />
                    <span className="text-sm">{uploadingPhoto ? "Uploading..." : "Upload from device"}</span>
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Images size={15} className="text-gray-400" />
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">iCloud gallery</p>
                    {galleryPhotos.length > 0 && (
                      <span className="text-xs text-gray-500">({galleryPhotos.length})</span>
                    )}
                  </div>

                  {galleryLoading ? (
                    <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                      Loading photos...
                    </div>
                  ) : galleryPhotos.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                      No photos in gallery. Sync iCloud photos first.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {galleryPhotos.map((photo) => (
                          <button
                            key={photo.guid}
                            onClick={() => setSelectedGalleryGuid(
                              selectedGalleryGuid === photo.guid ? null : photo.guid
                            )}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              selectedGalleryGuid === photo.guid
                                ? "border-blue-400 scale-95"
                                : "border-transparent hover:border-gray-500"
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {selectedGalleryGuid === photo.guid && (
                              <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Check size={11} className="text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {galleryHasMore && (
                        <button
                          onClick={handleLoadMoreGallery}
                          disabled={galleryLoadingMore}
                          className="w-full py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {galleryLoadingMore ? "Loading..." : "Load 25 more"}
                        </button>
                      )}

                      <button
                        onClick={handleSelectFromGallery}
                        disabled={!selectedGalleryGuid || addingFromGallery}
                        className="w-full py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {addingFromGallery ? "Adding..." : "Use selected photo"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === "events" && !showAddForm && (
          <div className="px-6 pb-5 pt-2 border-t border-gray-700/50">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} />
              Add Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
