import { useCallback, useLayoutEffect, useState } from "react";
import { normalizeHex } from "../lib/color";
import {
  DEFAULT_THEME,
  MAX_SWATCHES,
  Theme,
  ThemeKey,
  applyTheme,
  loadSwatches,
  loadTheme,
  saveSwatches,
  saveTheme,
} from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [swatches, setSwatches] = useState<string[]>(loadSwatches);

  // Layout effect, not effect: the vars must be on the document before the
  // browser paints, or the calendar flashes the default palette first.
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    saveSwatches(swatches);
  }, [swatches]);

  const setColor = useCallback((key: ThemeKey, hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;
    setTheme((prev) => (prev[key] === valid ? prev : { ...prev, [key]: valid }));
  }, []);

  const resetColor = useCallback((key: ThemeKey) => {
    setTheme((prev) => ({ ...prev, [key]: DEFAULT_THEME[key] }));
  }, []);

  const saveSwatch = useCallback((hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;
    setSwatches((prev) => (prev.includes(valid) ? prev : [valid, ...prev].slice(0, MAX_SWATCHES)));
  }, []);

  const removeSwatch = useCallback((hex: string) => {
    setSwatches((prev) => prev.filter((s) => s !== hex));
  }, []);

  return { theme, swatches, setColor, resetColor, saveSwatch, removeSwatch };
}
