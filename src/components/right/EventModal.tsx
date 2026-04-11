import { useState } from "react";
import { X, Clock, Trash2, Plus } from "lucide-react";
import { CalendarEvent, DatePhoto } from "../../types";

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
  }) => Promise<{ error: unknown }>;
  onDeleteEvent: (id: string) => void;
  onUploadPhoto: (date: string, file: File) => Promise<{ error: unknown }>;
  onDeletePhoto: (id: string, url: string) => void;
}

export function EventModal({
  date,
  events,
  photos,
  onClose,
  onAddEvent,
  onDeleteEvent,
  onUploadPhoto,
  onDeletePhoto,
}: EventModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [startMin, setStartMin] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMin, setEndMin] = useState("00");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "photos">("events");

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const displayDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const startTime = new Date(date);
    startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    const endTime = new Date(date);
    endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    await onAddEvent({ title: title.trim(), description: description.trim(), startTime, endTime, date: dateStr });
    setTitle("");
    setDescription("");
    setStartHour("09");
    setStartMin("00");
    setEndHour("10");
    setEndMin("00");
    setShowAddForm(false);
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

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-white font-semibold text-lg">{displayDate}</h2>
            <p className="text-gray-400 text-sm">{events.length} event{events.length !== 1 ? "s" : ""} · {photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
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

        <div className="overflow-y-auto flex-1 p-6">
          {activeTab === "events" && (
            <div className="space-y-3">
              {events.length === 0 && !showAddForm && (
                <p className="text-gray-500 text-sm text-center py-4">No events for this day</p>
              )}
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    event.source === "icloud"
                      ? "bg-blue-950/40 border-blue-800/40"
                      : "bg-emerald-950/40 border-emerald-800/40"
                  }`}
                >
                  <Clock size={16} className={`mt-0.5 shrink-0 ${event.source === "icloud" ? "text-blue-400" : "text-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{event.title}</p>
                    <p className={`text-xs mt-0.5 ${event.source === "icloud" ? "text-blue-400/70" : "text-emerald-400/70"}`}>
                      {formatTime(event.startTime)} – {formatTime(event.endTime)}
                    </p>
                    {event.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{event.description}</p>
                    )}
                    <p className="text-gray-600 text-xs mt-1">{event.source === "icloud" ? "iCloud" : "Local"}</p>
                  </div>
                  {event.source === "local" && (
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-red-500/60 hover:text-red-400 transition-colors p-1 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Start time</label>
                      <div className="flex gap-1">
                        <select value={startHour} onChange={(e) => setStartHour(e.target.value)}
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                          {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 self-center">:</span>
                        <select value={startMin} onChange={(e) => setStartMin(e.target.value)}
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                          {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">End time</label>
                      <div className="flex gap-1">
                        <select value={endHour} onChange={(e) => setEndHour(e.target.value)}
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                          {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 self-center">:</span>
                        <select value={endMin} onChange={(e) => setEndMin(e.target.value)}
                          className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                          {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowAddForm(false); setTitle(""); setDescription(""); }}
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
          )}

          {activeTab === "photos" && (
            <div>
              {photos.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No photos for this day</p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-800">
                    <img src={photo.photo_url} alt={photo.filename} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => onDeletePhoto(photo.id, photo.photo_url)}
                        className="text-red-400 hover:text-red-300 bg-black/50 rounded-lg p-2 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 text-xs text-white/70 bg-black/40 px-2 py-1 truncate">{photo.filename}</p>
                  </div>
                ))}
              </div>

              <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingPhoto ? "border-gray-600 text-gray-500" : "border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400"}`}>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                <Plus size={18} />
                <span className="text-sm">{uploadingPhoto ? "Uploading..." : "Upload Photo"}</span>
              </label>
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
