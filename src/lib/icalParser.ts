import { CalendarEvent } from "../types";

function parseICalDate(value: string, tzid?: string): Date {
  value = value.trim();
  if (value.includes("T")) {
    if (value.endsWith("Z")) {
      const year = parseInt(value.slice(0, 4));
      const month = parseInt(value.slice(4, 6)) - 1;
      const day = parseInt(value.slice(6, 8));
      const hour = parseInt(value.slice(9, 11));
      const min = parseInt(value.slice(11, 13));
      const sec = parseInt(value.slice(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    } else {
      const year = parseInt(value.slice(0, 4));
      const month = parseInt(value.slice(4, 6)) - 1;
      const day = parseInt(value.slice(6, 8));
      const hour = parseInt(value.slice(9, 11));
      const min = parseInt(value.slice(11, 13));
      const sec = parseInt(value.slice(13, 15));
      const d = new Date(year, month, day, hour, min, sec);
      return d;
    }
  } else {
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    return new Date(year, month, day, 0, 0, 0);
  }
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
  let current: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT") {
      inEvent = false;
      if (current["DTSTART"] && current["SUMMARY"]) {
        try {
          const dtStartRaw = current["DTSTART"] || "";
          const dtEndRaw = current["DTEND"] || dtStartRaw;
          const tzid = current["DTSTART;TZID"] ? current["DTSTART;TZID"].split(":")[0] : undefined;

          const startDate = parseICalDate(dtStartRaw, tzid);
          const endDate = parseICalDate(dtEndRaw, tzid);

          const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;

          events.push({
            id: current["UID"] || `${Date.now()}-${Math.random()}`,
            title: current["SUMMARY"].replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\;/g, ";"),
            description: (current["DESCRIPTION"] || "").replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\\;/g, ";"),
            startTime: startDate,
            endTime: endDate,
            date: dateStr,
            source: "icloud",
          });
        } catch {
          // skip invalid events
        }
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const rawKey = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1);
        const keyBase = rawKey.split(";")[0];

        if (keyBase === "DTSTART" || keyBase === "DTEND") {
          current[keyBase] = value;
        } else {
          current[keyBase] = value;
        }
      }
    }
  }

  return events;
}
