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
