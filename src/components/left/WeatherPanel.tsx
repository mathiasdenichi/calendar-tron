import { useWeather } from "../../hooks/useWeather";
import { getWeatherCondition, getWeatherDescription } from "../../lib/weatherCodes";
import { WeatherIcon } from "./WeatherIcon";

export function WeatherPanel() {
  const { weather, loading } = useWeather();

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
  const forecastDays = weather.daily.slice(1, 6);

  return (
    <div className="w-full">
      <div className="flex items-end gap-4 mb-4">
        <WeatherIcon condition={condition} size={88} />
        <div>
          <div className="flex items-end gap-2">
            <span className="text-white font-light drop-shadow-lg" style={{ fontSize: "4rem", lineHeight: 1 }}>
              {weather.current.temperature}°
            </span>
            <span className="text-white/70 text-xl mb-2">F</span>
          </div>
          <div className="text-white/70 text-base font-light">{description}</div>
          {todayForecast && (
            <div className="text-white/60 text-sm mt-1">
              H: {todayForecast.maxTemp}° · L: {todayForecast.minTemp}° · Wind: {weather.current.windSpeed} mph
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {forecastDays.map((day) => {
          const dc = getWeatherCondition(day.weatherCode);
          return (
            <div
              key={day.date}
              className="flex-1 bg-black/20 backdrop-blur-sm rounded-xl p-2 flex flex-col items-center gap-1 border border-white/10"
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
  );
}
