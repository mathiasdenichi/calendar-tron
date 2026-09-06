import { useRef, useLayoutEffect, useState } from "react";
import { useWeather } from "../../hooks/useWeather";
import { getWeatherCondition, getWeatherDescription } from "../../lib/weatherCodes";
import { WeatherIcon } from "./WeatherIcon";
import { RadarBox } from "./RadarBox";
import { CurrentWeather } from "./CurrentWeather";
import { HourlyStrip } from "./HourlyStrip";

interface WeatherPanelProps {
  onOpenRadar: () => void;
}

export function WeatherPanel({ onOpenRadar }: WeatherPanelProps) {
  const { weather, loading } = useWeather();
  const containerRef = useRef<HTMLDivElement>(null);
  const [radarDim, setRadarDim] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || radarDim !== null) return;
    const w = containerRef.current.offsetWidth;
    if (w > 0) {
      const forecastItemW = Math.floor((w - 4 * 8) / 5);
      setRadarDim(forecastItemW * 2 + 8);
    }
  });

  if (loading || !weather) {
    return (
      <div className="flex items-center gap-4 text-white/60 text-xl">
        <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
        <span>Loading weather...</span>
      </div>
    );
  }

  const condition = getWeatherCondition(weather.current.weatherCode);
  const description = getWeatherDescription(weather.current.weatherCode);
  const todayForecast = weather.daily[0];
  // Everything except today, which is already shown in the current-weather block.
  const forecastDays = weather.daily.slice(1);

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex gap-2 items-end">
        {/* min-w-0 is load-bearing: a flex item defaults to min-width:auto, so
            the hourly strip's max-content width would otherwise force this
            column wider than the panel and push RadarBox out of view. */}
        <div className="flex flex-col flex-1 min-w-0 gap-2">
          <CurrentWeather
            temperature={weather.current.temperature}
            condition={condition}
            description={description}
            todayHighLow={todayForecast ? { maxTemp: todayForecast.maxTemp, minTemp: todayForecast.minTemp } : undefined}
            windSpeed={weather.current.windSpeed}
          />
          <HourlyStrip hours={weather.hourly} />
          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x">
            <div className="flex gap-2">
              {forecastDays.map((day) => {
                const dc = getWeatherCondition(day.weatherCode);
                return (
                  <div
                    key={day.date}
                    // Stretches to fill when there's room, but stops shrinking at
                    // 56px — past that the row scrolls instead of crushing cards.
                    className="flex-1 min-w-[56px] bg-black/20 backdrop-blur-sm rounded-xl p-2 flex flex-col items-center gap-1 border border-white/10"
                  >
                    <span className="text-white/70 text-xs font-medium">{day.dayLabel}</span>
                    <WeatherIcon condition={dc} size={32} />
                    <span className="text-white text-sm font-medium">{day.maxTemp}°</span>
                    <span className="text-white/50 text-xs">{day.minTemp}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {radarDim !== null && (
          <RadarBox
            onClick={onOpenRadar}
            width={radarDim}
            height={radarDim}
          />
        )}
      </div>
    </div>
  );
}
