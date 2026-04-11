import { CalendarEvent } from "../types";

interface ParsedProp {
  value: string;
  params: Record<string, string>;
}

function parseLine(line: string): { key: string; prop: ParsedProp } | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx < 0) return null;
  const rawKey = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const parts = rawKey.split(";");
  const key = parts[0];
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq > 0) params[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
  }
  return { key, prop: { value, params } };
}

function extractYMD(raw: string): { year: number; month: number; day: number } | null {
  const s = raw.replace(/[TZ].*$/, "").trim();
  if (s.length < 8) return null;
  return {
    year: parseInt(s.slice(0, 4), 10),
    month: parseInt(s.slice(4, 6), 10) - 1,
    day: parseInt(s.slice(6, 8), 10),
  };
}

function extractHMS(raw: string): { hour: number; min: number; sec: number } {
  const tIdx = raw.indexOf("T");
  if (tIdx < 0) return { hour: 0, min: 0, sec: 0 };
  const time = raw.slice(tIdx + 1).replace(/Z$/, "");
  return {
    hour: parseInt(time.slice(0, 2), 10) || 0,
    min: parseInt(time.slice(2, 4), 10) || 0,
    sec: parseInt(time.slice(4, 6), 10) || 0,
  };
}

function parseICalDate(raw: string, isUtc: boolean): Date {
  const ymd = extractYMD(raw);
  if (!ymd) return new Date(NaN);
  const hms = extractHMS(raw);
  if (isUtc) {
    return new Date(Date.UTC(ymd.year, ymd.month, ymd.day, hms.hour, hms.min, hms.sec));
  }
  return new Date(ymd.year, ymd.month, ymd.day, hms.hour, hms.min, hms.sec);
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function unfoldLines(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

export function parseICS(ics: string): CalendarEvent[] {
  if (!ics || !ics.includes("BEGIN:VCALENDAR")) return [];

  const unfolded = unfoldLines(ics);
  const lines = unfolded.split(/\r?\n/);
  const events: CalendarEvent[] = [];

  let inEvent = false;
  let props: Record<string, ParsedProp> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      props = {};
    } else if (line === "END:VEVENT") {
      inEvent = false;

      const dtStartProp = props["DTSTART"];
      const dtEndProp = props["DTEND"];
      const summary = props["SUMMARY"];

      if (!dtStartProp || !summary) continue;

      try {
        const startRaw = dtStartProp.value;
        const endRaw = dtEndProp?.value || startRaw;
        const isUtc = startRaw.endsWith("Z");
        const isAllDay = !startRaw.includes("T");

        const startDate = isAllDay
          ? (() => { const y = extractYMD(startRaw)!; return new Date(y.year, y.month, y.day); })()
          : parseICalDate(startRaw, isUtc);
        const endDate = isAllDay
          ? (() => { const y = extractYMD(endRaw)!; return new Date(y.year, y.month, y.day); })()
          : parseICalDate(endRaw, isUtc);

        const ymd = extractYMD(startRaw);
        if (!ymd) continue;
        const dateStr = toDateString(ymd.year, ymd.month, ymd.day);

        const title = (summary.value || "")
          .replace(/\\,/g, ",")
          .replace(/\\n/g, " ")
          .replace(/\\;/g, ";");
        const description = (props["DESCRIPTION"]?.value || "")
          .replace(/\\,/g, ",")
          .replace(/\\n/g, "\n")
          .replace(/\\;/g, ";");

        events.push({
          id: props["UID"]?.value || `${Date.now()}-${Math.random()}`,
          title,
          description,
          startTime: startDate,
          endTime: endDate,
          date: dateStr,
          source: "icloud",
          allDay: isAllDay,
        });
      } catch {
        // skip invalid events
      }
    } else if (inEvent) {
      const parsed = parseLine(line);
      if (parsed) {
        props[parsed.key] = parsed.prop;
      }
    }
  }

  return events;
}
