import { useState, useEffect, useRef, useCallback } from "react";
import { getAllKeys, removeImages } from "../lib/localImageStore";
import { isKiosk } from "../lib/runtime";

export interface SlideshowPhoto {
  guid: string;
  /** Full-resolution image — use for anything displayed large. */
  url: string;
  /** Small derivative — use for thumbnails and grids. */
  thumbUrl: string;
  width: number;
  height: number;
}

interface AlbumEntry {
  guid: string;
  width: number;
  height: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The album as the kiosk's backend has it (kiosk-api.js). The kiosk caches every
 * photo on its own disk, so a phone over Tailscale is served from there rather
 * than from iCloud, and the immutable cache headers make its reloads instant.
 */
async function fetchAlbum(): Promise<AlbumEntry[]> {
  try {
    const res = await fetch("/__kiosk/photos", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.photos) ? data.photos : [];
  } catch {
    return [];
  }
}

/**
 * Phones get the small derivative (~74 KB) for both tiers, not the full one
 * (~666 KB): over cellular, the whole library at full size is gigabytes.
 */
function toPhoto(entry: AlbumEntry): SlideshowPhoto {
  const base = `/__kiosk/photo/${encodeURIComponent(entry.guid)}`;
  const thumbUrl = `${base}/thumb`;
  return {
    guid: entry.guid,
    url: isKiosk() ? `${base}/full` : thumbUrl,
    thumbUrl,
    width: entry.width,
    height: entry.height,
  };
}

/**
 * Before the kiosk cached photos on disk it kept them in IndexedDB - about
 * 2.26 GB on the DreamQuest. Nothing reads those any more; reclaim the space.
 * Only `slideshow:` keys: the per-day calendar photos (`date:`) share the store
 * and exist nowhere else.
 */
async function dropLegacyBrowserCache(): Promise<void> {
  try {
    localStorage.removeItem("slideshow_photos_meta");
    const stale = (await getAllKeys()).filter((k) => k.startsWith("slideshow:"));
    if (stale.length > 0) await removeImages(stale);
  } catch {
    // best effort
  }
}

const HISTORY_SIZE = 7;

export function useICloudPhotos() {
  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  // displayIndex: what's shown in the viewer (can be a history thumb pick)
  const [displayIndex, setDisplayIndex] = useState(0);
  // nextIndex: the "natural" cursor that the timer always advances from
  const nextIndexRef = useRef(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photosLengthRef = useRef(0);

  // Keep length ref in sync so interval closure doesn't go stale
  useEffect(() => {
    photosLengthRef.current = photos.length;
  }, [photos.length]);

  // Advance displayIndex and nextIndex together on timer tick
  const advanceNext = useCallback(() => {
    const len = photosLengthRef.current;
    if (len <= 1) return;
    const next = (nextIndexRef.current + 1) % len;
    nextIndexRef.current = next;
    setDisplayIndex((prev) => {
      setHistory((h) => [...h, prev].slice(-HISTORY_SIZE));
      return next;
    });
  }, []);

  // Called when user taps a history thumbnail — only changes display, NOT nextIndex
  const setCurrentIndex = useCallback((index: number) => {
    setDisplayIndex((prev) => {
      if (prev === index) return prev;
      setHistory((h) => [...h, prev].slice(-HISTORY_SIZE));
      return index;
    });
    // nextIndex is intentionally NOT updated here
  }, []);

  const load = useCallback(async () => {
    const album = await fetchAlbum();
    if (album.length === 0) return;
    // An hourly refresh must not reshuffle the slideshow under the viewer, so
    // only replace the list when the album's membership actually changed.
    setPhotos((prev) => {
      const known = new Set(prev.map((p) => p.guid));
      const same = prev.length === album.length && album.every((p) => known.has(p.guid));
      return same ? prev : shuffle(album.map(toPhoto));
    });
  }, []);

  /** Menu > Refresh photos: has the kiosk re-list the album right now. */
  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/__kiosk/photos/sync", { method: "POST" });
      await load();
    } catch {
      // keep what is on screen
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => {
    if (isKiosk()) dropLegacyBrowserCache();
    load().finally(() => setLoading(false));
    // The backend re-lists the album daily by itself; this just picks that up.
    const refresh = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [load]);

  // Timer always advances via advanceNext — stable, no stale closure on displayIndex
  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(advanceNext, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [photos.length, advanceNext]);

  // Modulo: an album that shrank on refresh can leave displayIndex past the end.
  const currentPhoto = photos.length > 0 ? photos[displayIndex % photos.length] : null;
  // upcomingIndex is always based on nextIndex, not displayIndex
  const upcomingIndex = photos.length > 1 ? (nextIndexRef.current + 1) % photos.length : null;

  return {
    photos,
    currentPhoto,
    currentIndex: displayIndex,
    nextIndex: nextIndexRef.current,
    history,
    upcomingIndex,
    loading,
    syncing,
    syncNow,
    setCurrentIndex,
  };
}

// Exported for useCalendar gallery loader. Kiosk-only: per-day photos are saved
// in the kiosk browser's own storage, so a pick made on a phone would go nowhere.
export async function loadLocalGalleryPhotos(offset = 0, pageSize = 25): Promise<{ photos: SlideshowPhoto[]; hasMore: boolean }> {
  if (!isKiosk()) return { photos: [], hasMore: false };
  const album = await fetchAlbum();
  const page = album.slice(offset, offset + pageSize).map(toPhoto);
  return { photos: page, hasMore: offset + pageSize < album.length };
}
