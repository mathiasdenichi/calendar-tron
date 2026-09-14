import { WeatherIcon } from "./WeatherIcon";
import { UvGauge } from "./UvGauge";
import { WeatherCondition } from "../../lib/weatherCodes";

interface CurrentWeatherProps {
  temperature: number;
  condition: WeatherCondition;
  description: string;
  todayHighLow?: { maxTemp: number; minTemp: number };
  windSpeed: number;
  uvIndex?: number;
}

export function CurrentWeather({ temperature, condition, description, todayHighLow, windSpeed, uvIndex }: CurrentWeatherProps) {
  return (
    <div className="flex items-end gap-2 lg:gap-4 mb-1 lg:mb-2">
      <WeatherIcon condition={condition} size={88} className="w-11 h-11 lg:w-[88px] lg:h-[88px] flex-shrink-0" />
      <div className="flex flex-col justify-end gap-1 min-w-0">
        <div className="flex items-end gap-2">
          <span className="text-white font-light drop-shadow-lg text-3xl lg:text-[4rem] leading-none">
            {temperature}°
          </span>
          <span className="text-white/70 text-sm lg:text-xl mb-0.5 lg:mb-2">F</span>
        </div>
        <div className="text-white/70 text-xs lg:text-base font-light">{description}</div>
        {todayHighLow && (
          <div className="text-white/60 text-[10px] lg:text-sm">
            H: {todayHighLow.maxTemp}° · L: {todayHighLow.minTemp}° · Wind: {windSpeed} mph
          </div>
        )}
      </div>

      {/* Third item in the row - icon, temperature cluster, UV - bottom aligned
          with the cluster rather than floating up beside the number.

          Kiosk only: below lg the panel is a phone in landscape at ~310px, where
          this collides with the wrapped H/L line, and there is no "big
          temperature" to sit beside there anyway. */}
      {uvIndex !== undefined && (
        <div className="hidden lg:block ml-auto pl-3 flex-shrink-0">
          <UvGauge index={uvIndex} />
        </div>
      )}
    </div>
  );
}
