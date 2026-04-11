import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { CalendarEvent, CustomEvent, DatePhoto } from "../types";
import { parseICS } from "../lib/icalParser";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function useCalendar() {
  const [icloudEvents, setIcloudEvents] = useState<CalendarEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [datePhotos, setDatePhotos] = useState<DatePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchICloudCalendar = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SUPABASE_URL}/functions/v1/icloud-calendar`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      });
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
  }) => {
    const { data, error } = await supabase
      .from("custom_events")
      .insert({
        title: event.title,
        description: event.description,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        date: event.date,
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

  const deleteDatePhoto = async (id: string, photoUrl: string) => {
    const path = photoUrl.split("/date-photos/")[1];
    if (path) await supabase.storage.from("date-photos").remove([path]);
    await supabase.from("date_photos").delete().eq("id", id);
    await fetchDatePhotos();
  };

  const allEvents = [...icloudEvents, ...localEvents].sort(
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
    deleteDatePhoto,
    refreshLocalEvents: fetchLocalEvents,
  };
}
