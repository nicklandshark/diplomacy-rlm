/**
 * IndexedDB cache for terrain textures (mask + heightmap).
 *
 * Both textures are deterministic — same inputs always produce the same output.
 * Caching the rasterized ImageData in IndexedDB lets subsequent page loads skip
 * the heavy generation (~150-300ms each) entirely, resolving in <5ms instead.
 *
 * We store raw ImageData (pixel buffer) rather than PNG blobs to avoid a
 * decode step on read.
 */

const DB_NAME = "terrain-textures";
const DB_VERSION = 1;
const STORE_NAME = "textures";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Retrieve cached ImageData by key. Returns null on miss or error. */
export async function getCachedImageData(
  key: string,
): Promise<ImageData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result;
        if (
          record &&
          record.data instanceof Uint8ClampedArray &&
          record.width > 0 &&
          record.height > 0
        ) {
          resolve(new ImageData(record.data, record.width, record.height));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Store ImageData under the given key. Fails silently on error. */
export async function setCachedImageData(
  key: string,
  imageData: ImageData,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      // Store as a plain object — structured clone handles Uint8ClampedArray
      store.put(
        {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        },
        key,
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // fail silently
    });
  } catch {
    // IndexedDB unavailable (e.g. private browsing in some browsers)
  }
}

/**
 * Simple djb2 string hash. Fast enough for ~200KB SVG strings (<1ms).
 * Returns a hex string suitable for use as a cache key.
 */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}
