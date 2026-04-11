export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "foggy"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "thunderstorm";

export function getWeatherCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 55) return "drizzle";
  if (code <= 65) return "rain";
  if (code <= 67) return "heavy-rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  if (code >= 95) return "thunderstorm";
  return "cloudy";
}

export function getWeatherDescription(code: number): string {
  const map: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Icy Fog",
    51: "Light Drizzle",
    53: "Drizzle",
    55: "Heavy Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    71: "Light Snow",
    73: "Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Showers",
    81: "Rain Showers",
    82: "Violent Showers",
    85: "Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm w/ Hail",
    99: "Thunderstorm w/ Heavy Hail",
  };
  return map[code] || "Unknown";
}
