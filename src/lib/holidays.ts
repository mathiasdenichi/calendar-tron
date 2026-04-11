import { CalendarEvent } from "../types";

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function makeHoliday(id: string, title: string, year: number, month: number, day: number): CalendarEvent {
  const ds = dateStr(year, month, day);
  return {
    id,
    title,
    startTime: new Date(year, month - 1, day),
    endTime: new Date(year, month - 1, day),
    date: ds,
    source: "local",
    allDay: true,
  };
}

function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function lastWeekday(year: number, month: number, weekday: number): number {
  const last = new Date(year, month, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return last.getDate() - diff;
}

function easterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

export function getHolidaysForYear(year: number): CalendarEvent[] {
  const holidays: CalendarEvent[] = [];

  const add = (id: string, title: string, month: number, day: number) =>
    holidays.push(makeHoliday(`holiday-${id}-${year}`, title, year, month, day));

  add("new-years-day", "New Year's Day", 1, 1);

  const mlkDay = nthWeekday(year, 1, 1, 3);
  add("mlk-day", "MLK Day", 1, mlkDay);

  const presidentsDay = nthWeekday(year, 2, 1, 3);
  add("presidents-day", "Presidents' Day", 2, presidentsDay);

  const memorialDay = lastWeekday(year, 5, 1);
  add("memorial-day", "Memorial Day", 5, memorialDay);

  add("juneteenth", "Juneteenth", 6, 19);

  add("independence-day", "Independence Day", 7, 4);

  const laborDay = nthWeekday(year, 9, 1, 1);
  add("labor-day", "Labor Day", 9, laborDay);

  const columbusDay = nthWeekday(year, 10, 1, 2);
  add("columbus-day", "Columbus Day", 10, columbusDay);

  add("veterans-day", "Veterans Day", 11, 11);

  const thanksgiving = nthWeekday(year, 11, 4, 4);
  add("thanksgiving", "Thanksgiving Day", 11, thanksgiving);

  add("christmas", "Christmas Day", 12, 25);

  const { month: easterMonth, day: easterDay } = easterDate(year);
  add("easter", "Easter Sunday", easterMonth, easterDay);

  const easterDate2 = new Date(year, easterMonth - 1, easterDay);

  const palmSundayDate = new Date(easterDate2);
  palmSundayDate.setDate(palmSundayDate.getDate() - 7);
  add("palm-sunday", "Palm Sunday", palmSundayDate.getMonth() + 1, palmSundayDate.getDate());

  const goodFridayDate = new Date(easterDate2);
  goodFridayDate.setDate(goodFridayDate.getDate() - 2);
  add("good-friday", "Good Friday", goodFridayDate.getMonth() + 1, goodFridayDate.getDate());

  const ashWednesdayDate = new Date(easterDate2);
  ashWednesdayDate.setDate(ashWednesdayDate.getDate() - 46);
  add("ash-wednesday", "Ash Wednesday", ashWednesdayDate.getMonth() + 1, ashWednesdayDate.getDate());

  add("christmas-eve", "Christmas Eve", 12, 24);

  add("new-years-eve", "New Year's Eve", 12, 31);

  const adventSunday = new Date(year, 11, 25);
  const dayOfWeek = adventSunday.getDay();
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const advent1 = new Date(year, 11, 25 - (dayOfWeek === 0 ? 21 : daysToSunday + 21));
  add("advent-1", "First Sunday of Advent", advent1.getMonth() + 1, advent1.getDate());

  add("epiphany", "Epiphany", 1, 6);

  const pentecostDate = new Date(easterDate2);
  pentecostDate.setDate(pentecostDate.getDate() + 49);
  add("pentecost", "Pentecost Sunday", pentecostDate.getMonth() + 1, pentecostDate.getDate());

  return holidays;
}

export function getHolidaysForRange(startYear: number, endYear: number): CalendarEvent[] {
  const all: CalendarEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    all.push(...getHolidaysForYear(y));
  }
  return all;
}
