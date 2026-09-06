import { Droplets } from "lucide-react";
import { HourlyForecast } from "../../types";
import { getWeatherCondition } from "../../lib/weatherCodes";
import { WeatherIcon } from "./WeatherIcon";

interface HourlyStripProps {
  hours: HourlyForecast[];
}

export function HourlyStrip({ hours }: HourlyStripProps) {
  if (hours.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden">
      <div className="flex gap-2 w-max">
        {hours.map((hour, i) => {
          const isNow = i === 0;
          return (
            <div
              key={hour.time}
              className={`flex-shrink-0 w-[58px] rounded-xl px-1.5 py-2 flex flex-col items-center gap-1
                backdrop-blur-sm border transition-colors
                ${isNow ? "bg-white/15 border-white/30" : "bg-black/20 border-white/10"}
              `}
            >
              <span
                className={`text-[11px] font-medium leading-none ${
                  isNow ? "text-white" : "text-white/70"
                }`}
              >
                {hour.hourLabel}
              </span>
              <WeatherIcon condition={getWeatherCondition(hour.weatherCode)} size={26} />
              <span className="text-white text-sm font-medium leading-none">{hour.temp}°</span>
              <span className="flex items-center gap-0.5 text-sky-300/70 text-[10px] leading-none">
                <Droplets size={9} />
                {hour.humidity}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
