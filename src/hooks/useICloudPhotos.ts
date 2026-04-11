import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface SlideshowPhoto {
  guid: string;
  url: string;
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

const HISTORY_SIZE = 7;

export function useICloudPhotos() {
  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [currentIndex, setCurrentIndexState] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setCurrentIndex = useCallback((index: number) => {
    setCurrentIndexState((prev) => {
      if (prev === index) return prev;
      setHistory((h) => {
        const next = [...h, prev];
        return next.slice(-HISTORY_SIZE);
      });
      return index;
    });
  }, []);

  const loadFromDB = useCallback(async (): Promise<SlideshowPhoto[]> => {
    const { data } = await supabase
      .from("slideshow_photos")
      .select("guid, storage_url, original_url, width, height")
      .order("created_at");

    if (!data || data.length === 0) return [];

    const VIDEO_EXTS = /\.(mp4|mov|m4v|avi|mkv|webm|3gp|hevc|heic\.mp4)(\?|$)/i;

    return data
      .filter((row: { storage_url: string | null; original_url: string }) => {
        const url = row.storage_url || row.original_url;
        return !VIDEO_EXTS.test(url);
      })
      .map((row: {
        guid: string;
        storage_url: string | null;
        original_url: string;
        width: number;
        height: number;
      }) => ({
        guid: row.guid,
        url: row.storage_url || row.original_url,
        width: row.width,
        height: row.height,
      }));
  }, []);

  const runSync = useCallback(async (showSyncing = false) => {
    if (showSyncing) setSyncing(true);
    try {
      const token = import.meta.env.VITE_ICLOUD_PHOTOS_TOKEN as string | undefined;
      await axios.post(
        `${SUPABASE_URL}/functions/v1/sync-icloud-photos`,
        token ? { token } : {},
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const fresh = await loadFromDB();
      if (fresh.length > 0) {
        setPhotos(shuffle(fresh));
      }
    } catch {
      // silently fail
    } finally {
      if (showSyncing) setSyncing(false);
    }
  }, [loadFromDB]);

  const syncNow = useCallback(() => runSync(true), [runSync]);

  useEffect(() => {
    async function init() {
      const dbPhotos = await loadFromDB();

      if (dbPhotos.length > 0) {
        setPhotos(shuffle(dbPhotos));
        setLoading(false);
        runSync(false);
      } else {
        setSyncing(true);
        await runSync(false);
        const synced = await loadFromDB();
        if (synced.length > 0) setPhotos(shuffle(synced));
        setSyncing(false);
        setLoading(false);
      }
    }

    init();

    const refreshInterval = setInterval(() => runSync(false), 24 * 60 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadFromDB, runSync]);

  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((currentIndex + 1) % photos.length);
    }, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [photos.length, currentIndex, setCurrentIndex]);

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;
  const upcomingIndex = photos.length > 1 ? (currentIndex + 1) % photos.length : null;

  return { photos, currentPhoto, currentIndex, history, upcomingIndex, loading, syncing, syncNow, setCurrentIndex };
}
