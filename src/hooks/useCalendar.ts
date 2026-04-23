import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { CalendarEvent, CustomEvent, DatePhoto } from "../types";
import { parseICS } from "../lib/icalParser";
import { supabase } from "../lib/supabase";
import { getHolidaysForRange } from "../lib/holidays";
import { SlideshowPhoto, loadLocalGalleryPhotos } from "./useICloudPhotos";
import { getAllDatePhotos, upsertDatePhoto, removeDatePhotosByDate, removeDatePhotoById } from "../lib/localPhotoDb";
import { storeImage, getImageUrl, removeImage } from "../lib/localImageStore";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function useCalendar() {
  const [icloudEvents, setIcloudEvents] = useState<CalendarEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [datePhotos, setDatePhotos] = useState<DatePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const holidayEvents = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return getHolidaysForRange(currentYear - 1, currentYear + 2).map((h) => ({
      ...h,
      source: "holiday" as const,
    }));
  }, []);

  const fetchICloudCalendar = useCallback(async () => {
    try {
      const calendarUrl = import.meta.env.VITE_ICLOUD_CALENDAR_URL as string | undefined;
      const { data } = await axios.post(
        `${SUPABASE_URL}/functions/v1/icloud-calendar`,
        calendarUrl ? { calendarUrl } : {},
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (data.ics) {
        const parsed = parseICS(data.ics);
        setIcloudEvents(parsed);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchLocalEvents = useCallback(async () => {
    const { data } = await supabase.from("custom_events").select("*").order("start_time");
    if (data) {
      const mapped: CalendarEvent[] = data.map((e: CustomEvent) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: new Date(e.start_time),
        endTime: new Date(e.end_time),
        date: e.date,
        source: "local" as const,
        allDay: e.all_day ?? false,
      }));
      setLocalEvents(mapped);
    }
  }, []);

  const fetchDatePhotos = useCallback(async () => {
    const stored = getAllDatePhotos();
    const hydrated = await Promise.all(
      stored.map(async (p) => {
        if (p.photo_url.startsWith("blob:") || !p.photo_url) {
          const fresh = await getImageUrl(`date:${p.id}`);
          return fresh ? { ...p, photo_url: fresh } : p;
        }
        return p;
      })
    );
    setDatePhotos(hydrated);
  }, []);

  useEffect(() => {
    Promise.all([fetchICloudCalendar(), fetchLocalEvents(), fetchDatePhotos()]).finally(() =>
      setLoading(false)
    );
    const interval = setInterval(() => {
      fetchICloudCalendar();
      fetchLocalEvents();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchICloudCalendar, fetchLocalEvents, fetchDatePhotos]);

  const addEvent = async (event: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    date: string;
    allDay: boolean;
  }) => {
    const { data, error } = await supabase
      .from("custom_events")
      .insert({
        title: event.title,
        description: event.description,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        date: event.date,
        all_day: event.allDay,
      })
      .select()
      .single();

    if (!error && data) {
      await fetchLocalEvents();
    }
    return { error };
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("custom_events").delete().eq("id", id);
    await fetchLocalEvents();
  };

  const updateEvent = async (id: string, event: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    date: string;
    allDay: boolean;
  }) => {
    const { error } = await supabase
      .from("custom_events")
      .update({
        title: event.title,
        description: event.description,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        date: event.date,
        all_day: event.allDay,
      })
      .eq("id", id);
    if (!error) await fetchLocalEvents();
    return { error };
  };

  const addDatePhoto = async (date: string, file: File) => {
    const removed = removeDatePhotosByDate(date);
    for (const p of removed) {
      await removeImage(`date:${p.id}`).catch(() => null);
    }

    const id = `${date}-${Date.now()}`;
    const key = `date:${id}`;
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await storeImage(key, blob);
    } catch {
      return { error: new Error("Failed to store image locally") };
    }

    const objectUrl = (await getImageUrl(key)) ?? "";
    const photo: DatePhoto = {
      id,
      date,
      photo_url: objectUrl,
      filename: file.name,
      created_at: new Date().toISOString(),
    };
    upsertDatePhoto(photo);
    fetchDatePhotos();
    return { error: null };
  };

  const addDatePhotoFromGallery = async (date: string, photo: SlideshowPhoto) => {
    const removed = removeDatePhotosByDate(date);
    for (const p of removed) {
      await removeImage(`date:${p.id}`).catch(() => null);
    }

    const id = `${date}-${Date.now()}`;
    const key = `date:${id}`;
    let objectUrl = photo.url;

    try {
      const res = await fetch(photo.url);
      if (res.ok) {
        const blob = await res.blob();
        await storeImage(key, blob);
        objectUrl = (await getImageUrl(key)) ?? photo.url;
      }
    } catch {
      // fall back to original URL if download fails
    }

    const record: DatePhoto = {
      id,
      date,
      photo_url: objectUrl,
      filename: `icloud-${photo.guid}.jpg`,
      created_at: new Date().toISOString(),
    };
    upsertDatePhoto(record);
    fetchDatePhotos();
    return { error: null };
  };

  const deleteDatePhoto = async (id: string, _photoUrl: string) => {
    removeDatePhotoById(id);
    await removeImage(`date:${id}`).catch(() => null);
    fetchDatePhotos();
  };

  const loadGalleryPhotos = (offset = 0): Promise<{ photos: SlideshowPhoto[]; hasMore: boolean }> => {
    return loadLocalGalleryPhotos(offset);
  };

  const allEvents = [...holidayEvents, ...icloudEvents, ...localEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const eventsByDate = allEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const photosByDate = datePhotos.reduce((acc, photo) => {
    if (!acc[photo.date]) acc[photo.date] = [];
    acc[photo.date].push(photo);
    return acc;
  }, {} as Record<string, DatePhoto[]>);

  return {
    allEvents,
    eventsByDate,
    photosByDate,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    addDatePhoto,
    addDatePhotoFromGallery,
    deleteDatePhoto,
    loadGalleryPhotos,
    refreshLocalEvents: fetchLocalEvents,
  };
}
