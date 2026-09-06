import { normalizeHex } from "./color";

export type ThemeKey = "background" | "dateText" | "eventColor" | "timeColor";

export type Theme = Record<ThemeKey, string>;

/** Matches the hand-authored palette the app shipped with. */
export const DEFAULT_THEME: Theme = {
  background: "#030712", // gray-950
  dateText: "#e5e7eb", // gray-200
  eventColor: "#10b981", // emerald-500
  timeColor: "#ffffff", // the clock shipped white
};

export const THEME_TABS: Array<{ key: ThemeKey; label: string; hint: string }> = [
  { key: "background", label: "Background", hint: "Calendar surface behind the month grid" },
  { key: "dateText", label: "Date Text", hint: "Day numbers and weekday headers" },
  { key: "eventColor", label: "Event Color", hint: "Your own events (iCloud and holidays keep their colors)" },
  { key: "timeColor", label: "Time Color", hint: "The clock above the weather panel" },
];

const CSS_VARS: Record<ThemeKey, string> = {
  background: "--cal-bg",
  dateText: "--cal-date",
  eventColor: "--cal-event",
  timeColor: "--cal-time",
};

const THEME_STORAGE_KEY = "calendar_theme";
const SWATCH_STORAGE_KEY = "calendar_theme_swatches";

export const MAX_SWATCHES = 12;

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw) as Partial<Theme>;

    // Merge over defaults so a stored theme written before a key existed — or
    // one with a corrupt value — still yields a complete, valid theme.
    const theme = { ...DEFAULT_THEME };
    for (const key of Object.keys(CSS_VARS) as ThemeKey[]) {
      const candidate = parsed?.[key];
      const valid = typeof candidate === "string" ? normalizeHex(candidate) : null;
      if (valid) theme[key] = valid;
    }
    return theme;
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // storage full or unavailable — the in-memory theme still applies
  }
}

export function loadSwatches(): string[] {
  try {
    const raw = localStorage.getItem(SWATCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map(normalizeHex)
      .filter((v): v is string => v !== null)
      .slice(0, MAX_SWATCHES);
  } catch {
    return [];
  }
}

export function saveSwatches(swatches: string[]): void {
  try {
    localStorage.setItem(SWATCH_STORAGE_KEY, JSON.stringify(swatches));
  } catch {
    // ignore
  }
}

/**
 * Pushes the theme onto the document as CSS custom properties. Components read
 * them via var(--cal-*), so a change repaints everything at once without any
 * prop drilling or re-render of the calendar tree.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const key of Object.keys(CSS_VARS) as ThemeKey[]) {
    root.style.setProperty(CSS_VARS[key], theme[key]);
  }
}
