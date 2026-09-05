const DB_NAME = "local-photo-store";
const DB_VERSION = 1;
const STORE_NAME = "images";

let dbPromise: Promise<IDBDatabase> | null = null;

// Object URLs live for the lifetime of the document, so mint at most one per key
// and reuse it. Without this the kiosk leaks a URL on every read — and it reads
// every photo on each 24h sync.
const resolvedUrls = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function forget(key: string): void {
  const url = resolvedUrls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    resolvedUrls.delete(key);
  }
}

export async function storeImage(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(blob, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  forget(key);
}

/** Reads many blobs in a single transaction — far cheaper than one tx per key. */
async function getImageBlobs(keys: string[]): Promise<Map<string, Blob>> {
  if (keys.length === 0) return new Map();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const out = new Map<string, Blob>();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    for (const key of keys) {
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result instanceof Blob) out.set(key, req.result);
      };
    }
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getImageUrls(keys: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const missing: string[] = [];

  for (const key of keys) {
    const cached = resolvedUrls.get(key);
    if (cached) out.set(key, cached);
    else missing.push(key);
  }

  const blobs = await getImageBlobs(missing);
  for (const [key, blob] of blobs) {
    const raced = resolvedUrls.get(key);
    if (raced) {
      out.set(key, raced);
      continue;
    }
    const url = URL.createObjectURL(blob);
    resolvedUrls.set(key, url);
    out.set(key, url);
  }

  return out;
}

export async function getImageUrl(key: string): Promise<string | null> {
  const urls = await getImageUrls([key]);
  return urls.get(key) ?? null;
}

export async function removeImage(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  forget(key);
}

/** Deletes many keys in a single transaction. */
export async function removeImages(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  for (const key of keys) forget(key);
}

export async function getAllKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

/** Fetches a remote image straight into IndexedDB. Does not mint an object URL. */
export async function downloadAndStore(key: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    if (blob.size === 0) return false;
    await storeImage(key, blob);
    return true;
  } catch {
    return false;
  }
}
