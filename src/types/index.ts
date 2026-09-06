export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  date: string;
  source: "icloud" | "local" | "holiday";
  allDay?: boolean;
}

export interface CustomEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  date: string;
  all_day: boolean;
  created_at: string;
}

export interface DatePhoto {
  id: string;
  date: string;
  photo_url: string;
  filename: string;
  created_at: string;
}

export interface WeatherData {
  current: {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    humidity?: number;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface HourlyForecast {
  /** Local-time key from the API, e.g. "2026-09-06T15:00". */
  time: string;
  /** "Now", then "3PM", "4PM", ... */
  hourLabel: string;
  temp: number;
  humidity: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  dayLabel: string;
}

export interface ICloudPhoto {
  guid: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}
