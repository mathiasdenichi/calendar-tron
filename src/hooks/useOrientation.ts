import { useEffect, useState } from "react";

const QUERY = "(orientation: portrait)";

/**
 * Tracks orientation in JS rather than CSS because the phone layout *unmounts*
 * the left panel instead of hiding it. Hiding it would keep the weather poll and
 * the radar tile fetches running on cellular for a panel nobody can see.
 */
export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(() => {
    try {
      return window.matchMedia(QUERY).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setPortrait(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return portrait;
}
