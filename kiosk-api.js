/**
 * The kiosk's own backend: iCloud calendar, iCloud shared-album photos, and
 * custom events. Replaces the Supabase project this app used to depend on.
 *
 * Everything lives on the kiosk's disk, under the data dir (see DATA_DIR).
 * Phones reach it through `tailscale serve` like the rest of the app, so a
 * phone's photos come from the kiosk's cache instead of iCloud.
 *
 * Mounted by kiosk-server.js in production and by vite.config.ts under
 * `npm run dev`, so both see the same endpoints and the same data.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, 'kiosk.config.json');

/**
 * Deliberately outside the repo: the supervisor runs `git reset --hard` on
 * every deploy, and outside Electron's per-origin storage, so it survives a
 * port or origin change. Shared by dev and prod. Back this folder up - the
 * custom events exist nowhere else.
 */
export const DATA_DIR =
  process.env['KIOSK_DATA_DIR'] ||
  path.join(process.env['APPDATA'] || path.join(os.homedir(), '.config'), 'calendar-tron');

const API_PREFIX = '/__kiosk/';

// Published (read-only) iCloud links. Overridable in kiosk.config.json.
const DEFAULT_CALENDAR_URL =
  'https://p152-caldav.icloud.com/published/2/MTA2MzQ3NjIxMjEwNjM0N4LByrBwLQCJeuYZk8N8eSWz-kXFfCrjPE6wiv_gej2t1-NE16Ciw3-i3BPwqcJuzafMYRDCm0Kg1NLqhFi69J4';
const DEFAULT_PHOTOS_TOKEN = 'B2I55Z2WMGuSye2';

const CALENDAR_TTL_MS = 2 * 60_000;
const ALBUM_REFRESH_MS = 24 * 60 * 60_000;
const DOWNLOAD_CONCURRENCY = 4;

function readConfig() {
  // Not cached: a deploy can change it under a long-running process.
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

/** Write-then-rename, so a crash mid-write never leaves a truncated file. */
async function writeFileAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

// ---------------------------------------------------------------- calendar ---

let calendarCache = { at: 0, ics: '' };

async function fetchCalendar() {
  if (calendarCache.ics && Date.now() - calendarCache.at < CALENDAR_TTL_MS) return calendarCache.ics;

  const url = String(readConfig().calendarUrl || DEFAULT_CALENDAR_URL).replace(/^webcal:\/\//, 'https://');
  // iCloud occasionally rejects one user agent and accepts another.
  for (const ua of ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'CalendarApp/1.0']) {
    const res = await fetch(url, { headers: { Accept: 'text/calendar, text/plain, */*', 'User-Agent': ua } });
    if (!res.ok) continue;
    const ics = await res.text();
    if (ics.includes('BEGIN:VCALENDAR')) {
      calendarCache = { at: Date.now(), ics };
      return ics;
    }
  }
  // Serve stale rather than blanking the calendar on a transient failure.
  if (calendarCache.ics) return calendarCache.ics;
  throw new Error('iCloud calendar returned no data');
}

// ------------------------------------------------------------------ events ---

function createEventStore(file) {
  let events = null;
  let writing = Promise.resolve();

  async function load() {
    if (events) return events;
    try {
      events = JSON.parse(await fsp.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // never overwrite a file we failed to parse
      events = [];
    }
    return events;
  }

  function persist() {
    // Serialized so two quick edits can't interleave their renames.
    writing = writing.then(() => writeFileAtomic(file, JSON.stringify(events, null, 2)));
    return writing;
  }

  function clean(input) {
    return {
      title: String(input.title ?? ''),
      description: String(input.description ?? ''),
      start_time: String(input.start_time),
      end_time: String(input.end_time),
      date: String(input.date),
      all_day: input.all_day === true,
    };
  }

  return {
    async list() {
      return [...(await load())].sort((a, b) => a.start_time.localeCompare(b.start_time));
    },
    async add(input) {
      const row = { id: crypto.randomUUID(), ...clean(input), created_at: new Date().toISOString() };
      (await load()).push(row);
      await persist();
      return row;
    },
    async update(id, input) {
      const list = await load();
      const i = list.findIndex((e) => e.id === id);
      if (i === -1) return null;
      list[i] = { ...list[i], ...clean(input) };
      await persist();
      return list[i];
    },
    async remove(id) {
      events = (await load()).filter((e) => e.id !== id);
      await persist();
    },
  };
}

// ------------------------------------------------------------------ photos ---

const ICLOUD_HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'https://www.icloud.com',
  Referer: 'https://www.icloud.com/',
};

async function postJson(url, body) {
  return fetch(url, { method: 'POST', headers: ICLOUD_HEADERS, body: JSON.stringify(body) });
}

/** Finds the album's home shard. iCloud answers 330 with the right host. */
async function resolveAlbum(token) {
  for (const shard of ['p23', 'p26', 'p34', 'p58', 'p66']) {
    let base = `https://${shard}-sharedstreams.icloud.com/${token}/sharedstreams`;
    try {
      let res = await postJson(`${base}/webstream`, { streamCtag: null });
      if (res.status === 330) {
        const host = (await res.json())['X-Apple-MMe-Host'];
        if (!host) continue;
        base = `https://${host}/${token}/sharedstreams`;
        res = await postJson(`${base}/webstream`, { streamCtag: null });
      }
      if (res.ok) return { base, stream: await res.json() };
    } catch {
      // try the next shard
    }
  }
  throw new Error('Could not reach the iCloud shared album');
}

/**
 * Lists the album: each photo's largest and smallest derivative, the same two
 * tiers the slideshow and strip display. Slow - iCloud takes ~50s to answer
 * for ~3,300 photos - so it runs daily, never on a request's critical path
 * once the manifest exists.
 *
 * Stores checksums, not URLs. iCloud's download URLs are signed and expire
 * within hours, so they are resolved just before each download instead.
 */
async function fetchAlbum(token) {
  const { base, stream } = await resolveAlbum(token);
  const photos = Array.isArray(stream.photos) ? stream.photos : [];

  const out = [];
  for (const p of photos) {
    if (!p.photoGuid || p.mediaAssetType === 'video') continue;
    const derivs = Object.values(p.derivatives ?? {})
      .filter((d) => d.checksum)
      .sort((a, b) => (b.fileSize || b.width || 0) - (a.fileSize || a.width || 0));
    if (derivs.length === 0) continue;
    out.push({
      guid: p.photoGuid,
      width: Number(derivs[0].width) || 0,
      height: Number(derivs[0].height) || 0,
      checksums: { full: derivs[0].checksum, thumb: derivs[derivs.length - 1].checksum },
    });
  }
  return { base, photos: out };
}

/**
 * checksum -> download URL for a batch of photos. Batches of 25: one request
 * for the whole album takes ~50s and silently drops some items, while small
 * batches return all of them several times faster.
 */
async function resolveAssetUrls(base, guids) {
  const res = await postJson(`${base}/webasseturls`, { photoGuids: guids });
  if (!res.ok) throw new Error(`iCloud webasseturls HTTP ${res.status}`);
  const items = (await res.json()).items ?? {};
  const urls = new Map();
  for (const [checksum, a] of Object.entries(items)) {
    if (a?.url_location && a?.url_path) urls.set(checksum, `https://${a.url_location}${a.url_path}`);
  }
  return urls;
}

const URL_BATCH = 25;

function createPhotoStore(dir) {
  const manifestFile = path.join(dir, 'manifest.json');
  /** @type {{ syncedAt: number, base: string, photos: Array<{guid: string, width: number, height: number, checksums: {full: string, thumb: string}}> }} */
  let manifest = null;
  let byGuid = new Map();
  let syncing = null;
  const inflight = new Map();
  let warmQueue = [];
  let warming = 0;

  const fileFor = (guid, tier) => path.join(dir, `${guid}.${tier}.jpg`);
  const validGuid = (guid) => /^[A-Za-z0-9_-]{1,128}$/.test(guid);
  const missingTiers = (guid) => ['thumb', 'full'].filter((t) => !fs.existsSync(fileFor(guid, t)));

  function setManifest(next) {
    manifest = next;
    byGuid = new Map(next.photos.map((p) => [p.guid, p]));
  }

  async function loadManifest() {
    if (manifest) return manifest;
    try {
      const saved = JSON.parse(await fsp.readFile(manifestFile, 'utf8'));
      // Pre-checksum manifests stored expiring URLs; treat them as empty.
      setManifest(saved.base && saved.photos?.[0]?.checksums !== undefined ? saved : { syncedAt: 0, base: '', photos: [] });
    } catch {
      setManifest({ syncedAt: 0, base: '', photos: [] });
    }
    return manifest;
  }

  /** Re-lists the album. Coalesces concurrent callers onto one request. */
  function sync() {
    if (syncing) return syncing;
    syncing = (async () => {
      await fsp.mkdir(dir, { recursive: true });
      const token = String(readConfig().photosToken || DEFAULT_PHOTOS_TOKEN);
      const { base, photos } = await fetchAlbum(token);
      setManifest({ syncedAt: Date.now(), base, photos });
      await writeFileAtomic(manifestFile, JSON.stringify(manifest));
      await pruneRemoved();
      warm();
      return manifest;
    })().finally(() => {
      syncing = null;
    });
    return syncing;
  }

  async function pruneRemoved() {
    for (const name of await fsp.readdir(dir)) {
      const m = /^(.+)\.(full|thumb)\.jpg$/.exec(name);
      if (m && !byGuid.has(m[1])) await fsp.rm(path.join(dir, name), { force: true });
    }
  }

  async function fetchTo(guid, tier, url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iCloud asset HTTP ${res.status}`);
    const file = fileFor(guid, tier);
    await writeFileAtomic(file, Buffer.from(await res.arrayBuffer()));
    return file;
  }

  /** Downloads the given tiers of a batch of photos with one URL lookup. */
  async function downloadBatch(guids) {
    const urls = await resolveAssetUrls(manifest.base, guids);
    for (const guid of guids) {
      const entry = byGuid.get(guid);
      if (!entry) continue;
      for (const tier of missingTiers(guid)) {
        const url = urls.get(entry.checksums[tier]);
        if (url) await once(guid, tier, () => fetchTo(guid, tier, url)).catch(() => undefined);
      }
    }
  }

  /** Shares one download between the warmer and a request for the same file. */
  function once(guid, tier, run) {
    const key = `${guid}.${tier}`;
    if (!inflight.has(key)) inflight.set(key, run().finally(() => inflight.delete(key)));
    return inflight.get(key);
  }

  /**
   * Fills the disk cache in the background, thumbs and fulls together, so a
   * photo is never fetched from iCloud while someone is waiting for it.
   */
  function warm() {
    warmQueue = manifest.photos.map((p) => p.guid).filter((g) => missingTiers(g).length > 0);
    while (warming < DOWNLOAD_CONCURRENCY && warmQueue.length > 0) {
      warming++;
      (async () => {
        try {
          while (warmQueue.length > 0) {
            await downloadBatch(warmQueue.splice(0, URL_BATCH)).catch(() => undefined);
          }
        } finally {
          warming--;
        }
      })();
    }
  }

  /** Path to a cached file, fetching it from iCloud on a miss. */
  async function ensure(guid, tier) {
    const file = fileFor(guid, tier);
    if (fs.existsSync(file)) return file;
    const entry = byGuid.get(guid);
    if (!entry) return null;
    return once(guid, tier, async () => {
      const url = (await resolveAssetUrls(manifest.base, [guid])).get(entry.checksums[tier]);
      if (!url) throw new Error('iCloud has no URL for this photo');
      return fetchTo(guid, tier, url);
    });
  }

  return {
    async list() {
      const m = await loadManifest();
      // First run, or a day since the last listing.
      if (m.photos.length === 0) await sync();
      else if (Date.now() - m.syncedAt > ALBUM_REFRESH_MS) sync().catch(() => undefined);
      return manifest.photos.map(({ guid, width, height }) => ({ guid, width, height }));
    },
    sync,
    async start() {
      await loadManifest();
      // Resume warming the cache after a restart without re-listing first.
      if (manifest.photos.length > 0) warm();
      sync().catch((err) => console.error('[kiosk] photo sync:', err.message));
      setInterval(() => sync().catch(() => undefined), ALBUM_REFRESH_MS).unref();
    },
    async serve(res, guid, tier) {
      if (!validGuid(guid)) return sendJson(res, 400, { error: 'bad photo id' });
      await loadManifest();
      const file = await ensure(guid, tier);
      if (!file) return sendJson(res, 404, { error: 'not in album' });
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        // A guid's bytes never change, so phones can keep these forever.
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      fs.createReadStream(file).pipe(res);
    },
  };
}

// ----------------------------------------------------------------- routing ---

/**
 * @param {{ dataDir?: string, syncPhotos?: boolean }} [options]
 *   syncPhotos: list the album and warm the cache at startup. Off for the dev
 *   server, which would otherwise race the kiosk for the same files.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => boolean}
 *   Handles the request and returns true, or returns false if it isn't ours.
 */
export function createKioskApi({ dataDir = DATA_DIR, syncPhotos = true } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const events = createEventStore(path.join(dataDir, 'events.json'));
  const photos = createPhotoStore(path.join(dataDir, 'photos'));
  if (syncPhotos) photos.start().catch((err) => console.error('[kiosk] photo sync:', err.message));

  async function route(req, res, pathname) {
    const method = req.method ?? 'GET';

    if (pathname === '/__kiosk/calendar' && method === 'GET') {
      return sendJson(res, 200, { ics: await fetchCalendar() });
    }

    if (pathname === '/__kiosk/events') {
      if (method === 'GET') return sendJson(res, 200, await events.list());
      if (method === 'POST') return sendJson(res, 201, await events.add(await readBody(req)));
    }

    const eventMatch = /^\/__kiosk\/events\/([0-9a-f-]{36})$/.exec(pathname);
    if (eventMatch) {
      if (method === 'PUT') {
        const row = await events.update(eventMatch[1], await readBody(req));
        return row ? sendJson(res, 200, row) : sendJson(res, 404, { error: 'no such event' });
      }
      if (method === 'DELETE') {
        await events.remove(eventMatch[1]);
        return sendJson(res, 200, { ok: true });
      }
    }

    if (pathname === '/__kiosk/photos' && method === 'GET') {
      return sendJson(res, 200, { photos: await photos.list() });
    }
    if (pathname === '/__kiosk/photos/sync' && method === 'POST') {
      const m = await photos.sync();
      return sendJson(res, 200, { count: m.photos.length });
    }

    const photoMatch = /^\/__kiosk\/photo\/([^/]+)\/(full|thumb)$/.exec(pathname);
    if (photoMatch && method === 'GET') {
      return photos.serve(res, photoMatch[1], photoMatch[2]);
    }

    return sendJson(res, 404, { error: 'unknown endpoint' });
  }

  return (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    } catch {
      return false;
    }
    // /__kiosk/info belongs to kiosk-server.js.
    if (!pathname.startsWith(API_PREFIX) || pathname === '/__kiosk/info') return false;

    route(req, res, pathname).catch((err) => {
      if (!res.headersSent) sendJson(res, 502, { error: String(err?.message ?? err) });
      else res.destroy();
    });
    return true;
  };
}
