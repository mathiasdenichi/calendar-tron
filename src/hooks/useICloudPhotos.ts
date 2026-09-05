import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { getImageUrls, getAllKeys, removeImages, downloadAndStore } from "../lib/localImageStore";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const LOCAL_META_KEY = "slideshow_photos_meta";

// Two cached tiers per photo: the full derivative drives the full-bleed slideshow,
// the small one drives the strip and the picker grid. Storing only the small one
// is what used to make the left panel look pixelated.
const SLIDESHOW_PREFIX = "slideshow:";
const fullKey = (guid: string) => `${SLIDESHOW_PREFIX}full:${guid}`;
const thumbKey = (guid: string) => `${SLIDESHOW_PREFIX}thumb:${guid}`;

const DOWNLOAD_CONCURRENCY = 6;

export interface SlideshowPhoto {
  guid: string;
  /** Full-resolution image — use for anything displayed large. */
  url: string;
  /** Small derivative — use for thumbnails and grids. */
  thumbUrl: string;
  width: number;
  height: number;
}

interface StoredPhotoMeta {
  guid: string;
  originalUrl: string;
  thumbUrl: string | null;
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

function loadStoredMeta(): StoredPhotoMeta[] {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    return raw ? (JSON.parse(raw) as StoredPhotoMeta[]) : [];
  } catch {
    return [];
  }
}

function saveStoredMeta(metas: StoredPhotoMeta[]): void {
  localStorage.setItem(LOCAL_META_KEY, JSON.stringify(metas));
}

/** Resolves cached blobs for a page of metadata, falling back to the remote URL. */
async function hydrate(metas: StoredPhotoMeta[]): Promise<SlideshowPhoto[]> {
  const keys: string[] = [];
  for (const m of metas) {
    keys.push(fullKey(m.guid), thumbKey(m.guid));
  }
  const urls = await getImageUrls(keys);

  return metas.map((m) => {
    const full = urls.get(fullKey(m.guid)) ?? m.originalUrl;
    const thumb = urls.get(thumbKey(m.guid)) ?? m.thumbUrl ?? full;
    return { guid: m.guid, url: full, thumbUrl: thumb, width: m.width, height: m.height };
  });
}

/** Runs tasks with a bounded number in flight. Never rejects. */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item).catch(() => undefined);
    }
  });
  await Promise.all(runners);
}

const VIDEO_EXTS = /\.(mp4|mov|m4v|avi|mkv|webm|3gp|hevc|heic\.mp4)(\?|$)/i;

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

  const loadFromLocal = useCallback(async (): Promise<SlideshowPhoto[]> => {
    const metas = loadStoredMeta().filter((m) => !VIDEO_EXTS.test(m.originalUrl));
    if (metas.length === 0) return [];
    return hydrate(metas);
  }, []);

  const runSync = useCallback(async (showSyncing = false) => {
    if (showSyncing) setSyncing(true);
    try {
      const token = import.meta.env.VITE_ICLOUD_PHOTOS_TOKEN as string | undefined;
      const { data } = await axios.post(
        `${SUPABASE_URL}/functions/v1/icloud-photos`,
        token ? { token } : {},
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!Array.isArray(data?.photos)) return;

      const incoming: Array<{ guid: string; url: string; thumbUrl: string; width: number; height: number }> = data.photos;

      const newMetas: StoredPhotoMeta[] = [];
      for (const p of incoming) {
        if (VIDEO_EXTS.test(p.url)) continue;
        newMetas.push({
          guid: p.guid,
          originalUrl: p.url,
          thumbUrl: p.thumbUrl || null,
          width: p.width,
          height: p.height,
        });
      }

      if (newMetas.length === 0) return;

      saveStoredMeta(newMetas);

      // Show full-resolution immediately by streaming from iCloud; the local
      // cache below just makes subsequent loads instant.
      if (photosLengthRef.current === 0) {
        const remote = await hydrate(newMetas);
        if (remote.length > 0) setPhotos(shuffle(remote));
      }

      const existingKeys = new Set(await getAllKeys());

      const jobs: Array<{ key: string; url: string }> = [];
      for (const m of newMetas) {
        const fk = fullKey(m.guid);
        const tk = thumbKey(m.guid);
        if (!existingKeys.has(fk)) jobs.push({ key: fk, url: m.originalUrl });
        if (!existingKeys.has(tk)) jobs.push({ key: tk, url: m.thumbUrl || m.originalUrl });
      }

      // Drop blobs for photos no longer in the album, plus the legacy
      // single-tier `slideshow:<guid>` entries from before the two-tier split.
      const wanted = new Set(jobs.map((j) => j.key));
      for (const m of newMetas) {
        wanted.add(fullKey(m.guid));
        wanted.add(thumbKey(m.guid));
      }
      const stale = [...existingKeys].filter((k) => k.startsWith(SLIDESHOW_PREFIX) && !wanted.has(k));
      if (stale.length > 0) await removeImages(stale);

      await runPool(jobs, DOWNLOAD_CONCURRENCY, async ({ key, url }) => {
        await downloadAndStore(key, url);
      });

      const fresh = await loadFromLocal();
      if (fresh.length > 0) {
        setPhotos(shuffle(fresh));
      }
    } catch {
      // silently fail
    } finally {
      if (showSyncing) setSyncing(false);
    }
  }, [loadFromLocal]);

  const syncNow = useCallback(() => runSync(true), [runSync]);

  useEffect(() => {
    async function init() {
      const localPhotos = await loadFromLocal();

      if (localPhotos.length > 0) {
        setPhotos(shuffle(localPhotos));
        setLoading(false);
        runSync(false);
      } else {
        setSyncing(true);
        await runSync(false);
        const synced = await loadFromLocal();
        if (synced.length > 0) setPhotos(shuffle(synced));
        setSyncing(false);
        setLoading(false);
      }
    }

    init();

    const refreshInterval = setInterval(() => runSync(false), 24 * 60 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadFromLocal, runSync]);

  // Timer always advances via advanceNext — stable, no stale closure on displayIndex
  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(advanceNext, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [photos.length, advanceNext]);

  const currentPhoto = photos.length > 0 ? photos[displayIndex] : null;
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

// Exported for useCalendar gallery loader
export async function loadLocalGalleryPhotos(offset = 0, pageSize = 25): Promise<{ photos: SlideshowPhoto[]; hasMore: boolean }> {
  const metas = loadStoredMeta().filter((m) => !VIDEO_EXTS.test(m.originalUrl));
  if (metas.length === 0) return { photos: [], hasMore: false };

  const page = metas.slice(offset, offset + pageSize);
  return { photos: await hydrate(page), hasMore: offset + pageSize < metas.length };
}
