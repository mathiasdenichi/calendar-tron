const KIOSK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * True only on the wall kiosk itself.
 *
 * The Electron shell always loads http://localhost:5173, while phones reach the
 * same app through the Tailscale hostname. That difference is the cleanest
 * signal we have, and it matters: browser storage is per-origin, so a phone
 * starts with an empty photo cache and would otherwise sync the entire
 * full-resolution iCloud library — gigabytes — over cellular.
 */
export function isKiosk(): boolean {
  try {
    return KIOSK_HOSTNAMES.has(window.location.hostname);
  } catch {
    return false;
  }
}

export interface KioskInfo {
  /** Tailscale URL a phone should visit, or null when unavailable. */
  url: string | null;
  /** Whether `tailscale serve` is actually proxying the kiosk port. */
  serving: boolean;
}

const INFO_PATH = "/__kiosk/info";

/**
 * Asks the host process where this kiosk is reachable from outside.
 *
 * Returns nulls rather than throwing: under `npm run dev` this path hits Vite's
 * SPA fallback and comes back as HTML, and the whole feature is optional.
 */
export async function fetchKioskInfo(): Promise<KioskInfo> {
  try {
    const res = await fetch(INFO_PATH, { cache: "no-store" });
    if (!res.ok) return { url: null, serving: false };
    const data = await res.json();
    return {
      url: typeof data?.url === "string" ? data.url : null,
      serving: data?.serving === true,
    };
  } catch {
    return { url: null, serving: false };
  }
}
