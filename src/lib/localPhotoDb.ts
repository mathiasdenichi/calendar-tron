import { DatePhoto } from "../types";

const KEY = "date_photos";

function load(): DatePhoto[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DatePhoto[]) : [];
  } catch {
    return [];
  }
}

function save(photos: DatePhoto[]): void {
  localStorage.setItem(KEY, JSON.stringify(photos));
}

export function getAllDatePhotos(): DatePhoto[] {
  return load();
}

export function upsertDatePhoto(photo: DatePhoto): void {
  const all = load().filter((p) => p.id !== photo.id);
  save([...all, photo]);
}

export function removeDatePhotosByDate(date: string): DatePhoto[] {
  const all = load();
  const removed = all.filter((p) => p.date === date);
  save(all.filter((p) => p.date !== date));
  return removed;
}

export function removeDatePhotoById(id: string): DatePhoto | null {
  const all = load();
  const target = all.find((p) => p.id === id) ?? null;
  save(all.filter((p) => p.id !== id));
  return target;
}
