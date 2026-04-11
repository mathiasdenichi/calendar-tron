import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ICloudPhoto } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function useICloudPhotos() {
  const [photos, setPhotos] = useState<ICloudPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchPhotos() {
    try {
      const { data } = await axios.get(`${SUPABASE_URL}/functions/v1/icloud-photos`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (data.photos && data.photos.length > 0) {
        setPhotos(data.photos.filter((p: ICloudPhoto) => p.url));
      }
    } catch {
      // silently fail, fallback will show
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPhotos();
    const refreshInterval = setInterval(fetchPhotos, 60 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (photos.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [photos.length]);

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;

  return { photos, currentPhoto, currentIndex, loading };
}
