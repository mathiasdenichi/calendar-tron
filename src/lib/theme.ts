import { normalizeHex } from "./color";

export type ThemeColorKey =
  | "background"
  | "titleText"
  | "dateText"
  | "subText"
  | "eventColor"
  | "timeColor";

/** Non-color decoration a preset can switch on (icon swaps, day markers). */
export type DecorId = "none" | "halloween" | "gingey";

export interface Theme {
  colors: Record<ThemeColorKey, string>;
  decor: DecorId;
  /** Which preset these values came from — drives per-tab "reset". */
  presetId: string;
}

export const DEFAULT_COLORS: Record<ThemeColorKey, string> = {
  background: "#030712", // gray-950
  titleText: "#ffffff",
  dateText: "#e5e7eb", // gray-200
  subText: "#6b7280", // gray-500
  eventColor: "#10b981", // emerald-500
  timeColor: "#ffffff", // the clock shipped white
};

export const THEME_TABS: Array<{ key: ThemeColorKey; label: string; hint: string }> = [
  { key: "background", label: "Background", hint: "Calendar surface behind the month grid" },
  { key: "titleText", label: "Title Text", hint: "Month heading and the day detail title" },
  { key: "dateText", label: "Date Text", hint: "Day numbers and weekday headers" },
  { key: "subText", label: "Subtext", hint: "Legend, hints and the “+N more” line" },
  { key: "eventColor", label: "Event Color", hint: "Your own events (iCloud and holidays keep their colors)" },
  { key: "timeColor", label: "Time Color", hint: "The clock above the weather panel" },
];

const CSS_VARS: Record<ThemeColorKey, string> = {
  background: "--cal-bg",
  titleText: "--cal-title",
  dateText: "--cal-date",
  subText: "--cal-subtext",
  eventColor: "--cal-event",
  timeColor: "--cal-time",
};

export const COLOR_KEYS = Object.keys(CSS_VARS) as ThemeColorKey[];

export interface Preset {
  id: string;
  label: string;
  emoji: string;
  colors: Record<ThemeColorKey, string>;
  decor: DecorId;
  /** Palette is a placeholder awaiting a spec. */
  provisional?: boolean;
}

// Deep saffron — the CSS-named saffron orange, and legible on black.
const SAFFRON = "#ff9933";
// Two tiers of the same purple: the lighter one carries the small text so it
// stays readable against dark grey.
const PURPLE = "#a855f7";
const PURPLE_LIGHT = "#c9a6fb";

export const PRESETS: Preset[] = [
  {
    id: "default",
    label: "Default",
    emoji: "🌙",
    colors: DEFAULT_COLORS,
    decor: "none",
  },
  {
    id: "halloween",
    label: "Halloween",
    emoji: "🎃",
    colors: {
      background: "#000000",
      titleText: SAFFRON,
      dateText: "#ffffff",
      subText: "#ffffff",
      eventColor: SAFFRON,
      timeColor: SAFFRON,
    },
    decor: "halloween",
  },
  {
    id: "gingey",
    label: "Gingey Holiday",
    emoji: "🐩",
    colors: {
      background: "#2d2d33",
      titleText: PURPLE,
      dateText: PURPLE_LIGHT,
      subText: PURPLE_LIGHT,
      eventColor: PURPLE,
      timeColor: PURPLE,
    },
    decor: "gingey",
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    emoji: "🦃",
    colors: {
      background: "#1a0f06",
      titleText: "#e8863a",
      dateText: "#f3e3cd",
      subText: "#c08b57",
      eventColor: "#b4462a",
      timeColor: "#e8863a",
    },
    decor: "none",
    provisional: true,
  },
  {
    id: "christmas",
    label: "Christmas",
    emoji: "🎄",
    colors: {
      background: "#0a1f12",
      titleText: "#e8342f",
      dateText: "#f4f7f2",
      subText: "#8fbf8f",
      eventColor: "#1f8a44",
      timeColor: "#f2d675",
    },
    decor: "none",
    provisional: true,
  },
];

export const DEFAULT_PRESET = PRESETS[0];

export function presetById(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}

export function themeFromPreset(preset: Preset): Theme {
  return { colors: { ...preset.colors }, decor: preset.decor, presetId: preset.id };
}

export const DEFAULT_THEME: Theme = themeFromPreset(DEFAULT_PRESET);

const THEME_STORAGE_KEY = "calendar_theme";
const SWATCH_STORAGE_KEY = "calendar_theme_swatches";

export const MAX_SWATCHES = 12;

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return themeFromPreset(DEFAULT_PRESET);

    const parsed = JSON.parse(raw);
    // Themes written before presets existed were a flat {key: hex} map.
    const storedColors = parsed?.colors ?? parsed ?? {};

    const colors = { ...DEFAULT_COLORS };
    for (const key of COLOR_KEYS) {
      const candidate = storedColors?.[key];
      const valid = typeof candidate === "string" ? normalizeHex(candidate) : null;
      if (valid) colors[key] = valid;
    }

    const storedDecor = parsed?.decor;
    const decor: DecorId =
      storedDecor === "halloween" || storedDecor === "gingey" ? storedDecor : "none";
    const presetId = typeof parsed?.presetId === "string" ? presetById(parsed.presetId).id : "default";

    return { colors, decor, presetId };
  } catch {
    return themeFromPreset(DEFAULT_PRESET);
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

// --- decor broadcast -------------------------------------------------------
// Decor swaps SVG artwork, which CSS variables cannot express, so components
// subscribe to it directly rather than threading a prop through every layer.

let currentDecor: DecorId = "none";
const decorListeners = new Set<() => void>();

export function getDecor(): DecorId {
  return currentDecor;
}

export function subscribeDecor(listener: () => void): () => void {
  decorListeners.add(listener);
  return () => {
    decorListeners.delete(listener);
  };
}

/**
 * Pushes colors onto the document as CSS custom properties and broadcasts the
 * decor. Components read colors via var(--cal-*), so a change repaints
 * everything at once without re-rendering the calendar tree.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const key of COLOR_KEYS) {
    root.style.setProperty(CSS_VARS[key], theme.colors[key]);
  }
  root.dataset.decor = theme.decor;

  if (theme.decor !== currentDecor) {
    currentDecor = theme.decor;
    decorListeners.forEach((listener) => listener());
  }
}
