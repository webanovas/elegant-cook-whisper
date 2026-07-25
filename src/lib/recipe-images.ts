// Image blob store in IndexedDB. Keeps huge base64 data URLs out of
// localStorage, which has a ~5MB quota on mobile Safari.
import { useEffect, useState } from "react";

const DB_NAME = "gourmet-notes";
const STORE = "recipe-images";
const VERSION = 1;

export const IDB_MARKER = "idb:";

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function putRecipeImage(id: string, dataUrl: string): Promise<void> {
  if (!isBrowser()) return;
  const blob = await dataUrlToBlob(dataUrl);
  await tx("readwrite", (s) => s.put(blob, id));
  // Notify any mounted image hooks that the blob is now available. Fixes
  // the race where saveRecipe writes the "idb:" marker before the blob
  // has actually landed in IndexedDB.
  window.dispatchEvent(new CustomEvent("gn:image-updated", { detail: { id } }));
}

export async function getRecipeImage(id: string): Promise<Blob | undefined> {
  if (!isBrowser()) return undefined;
  try {
    return await tx<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
  } catch {
    return undefined;
  }
}

export async function deleteRecipeImage(id: string): Promise<void> {
  if (!isBrowser()) return;
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}

export function useRecipeImage(id: string, storedUrl: string | null): string | null {
  const [url, setUrl] = useState<string | null>(
    storedUrl && !storedUrl.startsWith(IDB_MARKER) ? storedUrl : null,
  );

  useEffect(() => {
    if (!storedUrl) {
      setUrl(null);
      return;
    }
    if (!storedUrl.startsWith(IDB_MARKER)) {
      setUrl(storedUrl);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    getRecipeImage(id).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, storedUrl]);

  return url;
}
