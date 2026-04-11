import { WeatherIcon } from "./WeatherIcon";
import { WeatherCondition } from "../../lib/weatherCodes";

interface CurrentWeatherProps {
  temperature: number;
  condition: WeatherCondition;
  description: string;
  todayHighLow?: { maxTemp: number; minTemp: number };
  windSpeed: number;
}

export function CurrentWeather({ temperature, condition, description, todayHighLow, windSpeed }: CurrentWeatherProps) {
  return (
    <div className="flex items-end gap-4 mb-2">
      <WeatherIcon condition={condition} size={88} />
      <div className="flex flex-col justify-end gap-1">
        <div className="flex items-end gap-2">
          <span className="text-white font-light drop-shadow-lg" style={{ fontSize: "4rem", lineHeight: 1 }}>
            {temperature}°
          </span>
          <span className="text-white/70 text-xl mb-2">F</span>
        </div>
        <div className="text-white/70 text-base font-light">{description}</div>
        {todayHighLow && (
          <div className="text-white/60 text-sm">
            H: {todayHighLow.maxTemp}° · L: {todayHighLow.minTemp}° · Wind: {windSpeed} mph
          </div>
        )}
      </div>
    </div>
  );
}
