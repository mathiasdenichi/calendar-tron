import { useState, useEffect } from "react";
import axios from "axios";
import { HourlyForecast, WeatherData } from "../types";

const LAT = 27.2117;
const LON = -82.4717;
const TZ = "America/New_York";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HOURS_AHEAD = 12;
// Today plus six days. Six is deliberate: a seventh would repeat today's
// weekday label, and it gives the daily row enough cards to actually scroll.
const FORECAST_DAYS = 7;
const REFRESH_MS = 10 * 60 * 1000;

/** "2026-09-06T15:00" -> "3PM". */
function hourLabel(time: string): string {
  const h = parseInt(time.slice(11, 13), 10);
  if (Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}${h < 12 ? "AM" : "PM"}`;
}

/**
 * The current hour as Open-Meteo formats it, e.g. "2026-09-06T09:00".
 *
 * Resolved in TZ rather than from the device clock: hourly.time values are
 * naive local-time strings, so `new Date(t)` would silently interpret them in
 * whatever timezone the kiosk happens to be set to.
 */
function currentHourKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Some ICU builds render midnight as hour 24.
  const hour = part("hour") === "24" ? "00" : part("hour");

  return `${part("year")}-${part("month")}-${part("day")}T${hour}:00`;
}

/**
 * Open-Meteo returns hourly series across the whole forecast window, so find
 * where the current hour sits in it and take the next 12 from there.
 *
 * Note current_weather.time is NOT hour-aligned (it reports e.g. "09:15"), so
 * it cannot be used to index into hourly.time directly.
 */
function sliceHourly(data: {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relativehumidity_2m?: number[];
    weathercode?: number[];
  };
}): HourlyForecast[] {
  const times = data.hourly?.time ?? [];
  if (times.length === 0) return [];

  let start = times.indexOf(currentHourKey());

  // Fall back to the first hour at or after now if the series doesn't cover
  // the current hour for some reason.
  if (start < 0) {
    const nowMs = Date.now();
    start = times.findIndex((t) => new Date(t).getTime() >= nowMs);
  }
  if (start < 0) start = 0;

  return times.slice(start, start + HOURS_AHEAD).map((time, i) => ({
    time,
    hourLabel: i === 0 ? "Now" : hourLabel(time),
    temp: Math.round(data.hourly?.temperature_2m?.[start + i] ?? 0),
    humidity: Math.round(data.hourly?.relativehumidity_2m?.[start + i] ?? 0),
    weatherCode: data.hourly?.weathercode?.[start + i] ?? 0,
  }));
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWeather() {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&current_weather=true` +
        `&hourly=temperature_2m,relativehumidity_2m,weathercode` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
        `&temperature_unit=fahrenheit&windspeed_unit=mph` +
        `&timezone=${encodeURIComponent(TZ)}&forecast_days=${FORECAST_DAYS}`;
      const { data } = await axios.get(url);

      const daily = data.daily.time.slice(0, FORECAST_DAYS).map((dateStr: string, i: number) => {
        const d = new Date(dateStr + "T00:00:00");
        return {
          date: dateStr,
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weathercode[i],
          dayLabel: i === 0 ? "Today" : DAY_LABELS[d.getDay()],
        };
      });

      const hourly = sliceHourly(data);

      setWeather({
        current: {
          temperature: Math.round(data.current_weather.temperature),
          weatherCode: data.current_weather.weathercode,
          windSpeed: Math.round(data.current_weather.windspeed),
          humidity: hourly[0]?.humidity,
        },
        hourly,
        daily,
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather();
    // Re-fetch on a timer so the panel — and the "Now" column of the hourly
    // strip — roll forward without the app being reloaded.
    const interval = setInterval(fetchWeather, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading, error };
}
