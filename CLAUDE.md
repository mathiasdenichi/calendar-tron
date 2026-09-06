# Calendar Tron

A wall-mounted family calendar kiosk. React 18 + TypeScript + Tailwind, built by
Vite, wrapped in Electron, running fullscreen on a Windows machine called
**DreamQuest**. A PowerShell supervisor polls `origin/main` and redeploys.

Left third: photo slideshow, clock, weather, radar. Right two thirds: month grid.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run typecheck  # must stay clean
npm run lint       # must stay at 0 errors
npm run kiosk      # build + launch Electron
```

`npm run lint` has **3 known warnings and 0 errors**. Keep it that way — treat any
new error as a regression.

## Data locations (this trips people up)

| Data | Lives in | Survives a new device? |
|---|---|---|
| Custom events | Supabase `custom_events` | yes |
| iCloud calendar | Supabase edge fn, published ICS | yes |
| Weather / radar | Open-Meteo / RainViewer | yes |
| Slideshow photos | **IndexedDB on the kiosk** (~2.26 GB) | **no** |
| Per-day calendar photos | **localStorage + IndexedDB on the kiosk** | **no** |
| Theme + saved swatches | **localStorage on the kiosk** | **no** |

The per-day photos exist **nowhere else**. There is no server copy. Anything that
changes the browser origin destroys them.

## Load-bearing decisions — do not "simplify" these

Each of these looks like an oddity and is not. They were established the hard way.

**Electron serves the app over `http://localhost:5173`; it does not use
`loadFile()`.** Two independent reasons. (1) Chromium blocks
`<script type="module">` over `file://` — opaque origin, CORS failure, white
screen; Vite always emits a module script. (2) Browser storage is partitioned by
origin, and that exact origin is where the photo cache and per-day photos live.
Changing scheme, host, or port orphans all of it.

**`kiosk-server.js` binds the hostname `localhost`, not `127.0.0.1`.** The window
loads `http://localhost:5173`, so Node and Chromium must resolve it identically or
an IPv6-first machine gets connection refused. `KIOSK_HOST=0.0.0.0` opens it to
the LAN (no auth — be deliberate).

**`scripts/kiosk.ps1` sets `$ErrorActionPreference = 'Continue'`, not `'Stop'`.**
git and npm write progress to stderr *on success*; under `Stop`, PowerShell turns
that into a terminating `NativeCommandError` and every deploy silently "fails"
forever. Exit codes are checked explicitly in `Invoke-Native`.

**`scripts/kiosk.ps1` is pure ASCII.** PowerShell 5.1 reads BOM-less files as
Windows-1252, so non-ASCII decodes as mojibake. Do not add em-dashes or smart
quotes.

**The supervisor tracks `.kiosk-deployed`, not `HEAD`.** A failed build is retried
on the next poll instead of stranding the kiosk on a half-deploy.

**`npm ci` failures fall back to `npm install`.** `npm ci` deletes `node_modules`
first, so a failure leaves no `vite` to build with *and* no `electron.exe` to
launch. `Start-Kiosk` also repairs a missing `electron.exe` before launching.

**Photo sync is gated to the kiosk** via `isKiosk()` in `src/lib/runtime.ts`
(hostname is `localhost` only on the kiosk). A phone is a fresh origin with an
empty cache and would otherwise pull ~2,980 full-resolution photos over cellular.

**`min-w-0` on the weather panel's left column** in `WeatherPanel.tsx`. A flex
item defaults to `min-width: auto`, so the hourly strip's max-content width forces
the column wider than the panel and pushes `RadarBox` out of an `overflow-hidden`
parent. Removing it makes the radar vanish and the strips stop scrolling.

**`transform-origin` on an SVG `<g>` also re-anchors its `transform` attribute.**
The attribute maps to the CSS `transform` property. Setting an origin for an
opacity-only animation silently shifts any scaled child. Only set it where the
animation actually rotates.

**The QR code renders dark-on-white regardless of theme.** Scanners need the
contrast polarity and the quiet zone. A themed QR is a broken QR.

**`useWeather` anchors the hourly strip with `Intl.DateTimeFormat` in
`America/New_York`,** not the device clock. Open-Meteo returns naive local-time
strings, and `current_weather.time` is **not hour-aligned** (it reports e.g.
`09:15`), so it cannot index into `hourly.time`.

**`radarService` refreshes the frame manifest every 5 min and prunes its tile
cache.** It previously fetched once and froze forever. The cache is keyed by frame
path so expired frames can be evicted — without that it grows unbounded on a
display that runs for weeks.

**`localImageStore` caches object URLs per key.** `URL.createObjectURL` leaks
otherwise, and photos are read on every sync.

## Working on the DreamQuest itself

**Stop the supervisor first.** It runs `git reset --hard origin/main` on every
deploy and will destroy uncommitted edits within two minutes. Ctrl+C its terminal
or disable the Task Scheduler entry while working hands-on.

`Ctrl+Shift+Q` quits the kiosk window — it ignores ordinary close requests on
purpose. Progress is in `kiosk.log`.

`kiosk.config.json` holds the public URL and whether the supervisor manages
`tailscale serve`. Edit it in the repo and push; an edit made on the kiosk is
discarded on the next deploy.

See `docs/kiosk-setup.md` for the full deployment story.

## Conventions

- **The user commits and pushes manually.** Do not offer to commit, and do not run
  `git add`/`commit`/`push` unsolicited. Report what changed and stop.
- Verify with the real thing where possible — this project has been bitten
  repeatedly by changes that typechecked and still broke visually or at runtime.
- Comments explain *why*, especially for the constraints above.

## Open items

- `Thanksgiving` and `Christmas` presets have placeholder palettes and no decor,
  awaiting a spec. `halloween` and `gingey` are complete.
- No phone layout. Only `portrait:`/`landscape:` variants exist — a 390px screen
  gets a seven-column grid. An agenda view is the likely answer.
- No service worker. Add to Home Screen works without one; caching against a
  kiosk that auto-deploys needs care.
- The weather panel's own text (temperature, condition, H/L) is not themeable —
  it stays white in every preset. Would need a seventh theme key.
