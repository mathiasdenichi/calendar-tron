export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  date: string;
  source: "icloud" | "local";
}

export interface CustomEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  date: string;
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
  daily: DailyForecast[];
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
