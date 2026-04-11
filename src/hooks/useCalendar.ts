import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { CalendarEvent, CustomEvent, DatePhoto } from "../types";
import { parseICS } from "../lib/icalParser";
import { supabase } from "../lib/supabase";
import { getHolidaysForRange } from "../lib/holidays";
import { SlideshowPhoto } from "./useICloudPhotos";

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
    const { data } = await supabase.from("date_photos").select("*").order("created_at");
    if (data) setDatePhotos(data as DatePhoto[]);
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

  const addDatePhoto = async (date: string, file: File) => {
    const existing = datePhotos.filter((p) => p.date === date);
    for (const p of existing) {
      const storagePath = p.photo_url.split("/date-photos/")[1];
      if (storagePath) await supabase.storage.from("date-photos").remove([storagePath]);
      await supabase.from("date_photos").delete().eq("id", p.id);
    }

    const ext = file.name.split(".").pop();
    const path = `${date}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("date-photos").upload(path, file);
    if (uploadError) return { error: uploadError };

    const { data: urlData } = supabase.storage.from("date-photos").getPublicUrl(path);
    const { error: dbError } = await supabase.from("date_photos").insert({
      date,
      photo_url: urlData.publicUrl,
      filename: file.name,
    });

    if (!dbError) await fetchDatePhotos();
    return { error: dbError };
  };

  const addDatePhotoFromGallery = async (date: string, photo: SlideshowPhoto) => {
    const existing = datePhotos.filter((p) => p.date === date);
    for (const p of existing) {
      const storagePath = p.photo_url.split("/date-photos/")[1];
      if (storagePath) await supabase.storage.from("date-photos").remove([storagePath]);
      await supabase.from("date_photos").delete().eq("id", p.id);
    }

    const { error: dbError } = await supabase.from("date_photos").insert({
      date,
      photo_url: photo.url,
      filename: `icloud-${photo.guid}.jpg`,
    });

    if (!dbError) await fetchDatePhotos();
    return { error: dbError };
  };

  const deleteDatePhoto = async (id: string, photoUrl: string) => {
    const storagePath = photoUrl.split("/date-photos/")[1];
    if (storagePath) await supabase.storage.from("date-photos").remove([storagePath]);
    await supabase.from("date_photos").delete().eq("id", id);
    await fetchDatePhotos();
  };

  const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|avi|mkv|webm|3gp|hevc|gif)(\?|$)/i;
  const GALLERY_PAGE_SIZE = 25;

  const loadGalleryPhotos = async (offset = 0): Promise<{ photos: SlideshowPhoto[]; hasMore: boolean }> => {
    const { data } = await supabase
      .from("slideshow_photos")
      .select("guid, storage_url, original_url, thumb_url, width, height")
      .order("created_at", { ascending: false })
      .range(offset, offset + GALLERY_PAGE_SIZE + 9);

    if (!data || data.length === 0) return { photos: [], hasMore: false };

    const filtered = data.filter((row: { guid: string; storage_url: string | null; original_url: string }) => {
      const url = row.storage_url || row.original_url || "";
      return !VIDEO_EXTENSIONS.test(url);
    });

    const photos = filtered.slice(0, GALLERY_PAGE_SIZE).map((row: { guid: string; storage_url: string | null; original_url: string; thumb_url: string | null; width: number; height: number }) => ({
      guid: row.guid,
      url: row.thumb_url || row.storage_url || row.original_url,
      width: row.width,
      height: row.height,
    }));

    return { photos, hasMore: filtered.length > GALLERY_PAGE_SIZE || data.length > GALLERY_PAGE_SIZE };
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
    deleteEvent,
    addDatePhoto,
    addDatePhotoFromGallery,
    deleteDatePhoto,
    loadGalleryPhotos,
    refreshLocalEvents: fetchLocalEvents,
  };
}
