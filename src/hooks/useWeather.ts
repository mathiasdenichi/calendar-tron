import { useState, useEffect } from "react";
import axios from "axios";
import { WeatherData } from "../types";

const LAT = 27.2117;
const LON = -82.4717;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWeather() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FNew_York&forecast_days=6`;
      const { data } = await axios.get(url);

      const daily = data.daily.time.slice(0, 6).map((dateStr: string, i: number) => {
        const d = new Date(dateStr + "T00:00:00");
        return {
          date: dateStr,
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weathercode[i],
          dayLabel: i === 0 ? "Today" : DAY_LABELS[d.getDay()],
        };
      });

      setWeather({
        current: {
          temperature: Math.round(data.current_weather.temperature),
          weatherCode: data.current_weather.weathercode,
          windSpeed: Math.round(data.current_weather.windspeed),
        },
        daily,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading, error };
}
