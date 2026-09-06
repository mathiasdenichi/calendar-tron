import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { normalizeHex } from "../lib/color";
import {
  DecorId,
  MAX_SWATCHES,
  Preset,
  Theme,
  ThemeColorKey,
  applyTheme,
  getDecor,
  loadSwatches,
  loadTheme,
  presetById,
  saveSwatches,
  saveTheme,
  subscribeDecor,
  themeFromPreset,
} from "../lib/theme";

/** Subscribes any component to decor changes without prop drilling. */
export function useDecor(): DecorId {
  return useSyncExternalStore(subscribeDecor, getDecor, getDecor);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [swatches, setSwatches] = useState<string[]>(loadSwatches);

  // Layout effect, not effect: the vars must be on the document before the
  // browser paints, or the calendar flashes the previous palette first.
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    saveSwatches(swatches);
  }, [swatches]);

  const setColor = useCallback((key: ThemeColorKey, hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;
    setTheme((prev) =>
      prev.colors[key] === valid
        ? prev
        : { ...prev, colors: { ...prev.colors, [key]: valid } }
    );
  }, []);

  /** Restores one color to the active preset's value, not the app default. */
  const resetColor = useCallback((key: ThemeColorKey) => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: presetById(prev.presetId).colors[key] },
    }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setTheme(themeFromPreset(preset));
  }, []);

  const saveSwatch = useCallback((hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;
    setSwatches((prev) => (prev.includes(valid) ? prev : [valid, ...prev].slice(0, MAX_SWATCHES)));
  }, []);

  const removeSwatch = useCallback((hex: string) => {
    setSwatches((prev) => prev.filter((s) => s !== hex));
  }, []);

  return { theme, swatches, setColor, resetColor, applyPreset, saveSwatch, removeSwatch };
}
