// Image blob store in IndexedDB. Keeps huge base64 data URLs out of
// localStorage, which has a ~5MB quota on mobile Safari.
import { useEffect, useState } from "react";

const DB_NAME = "gourmet-notes";
const STORE = "recipe-images";
const VERSION = 1;

export const IDB_MARKER = "idb:";

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSvgText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === 2) break;
  }
  if (current && lines.length < 3) lines.push(current);
  return lines.slice(0, 3);
}

export function createRecipeCoverDataUrl(recipe: {
  title: string;
  tags?: string[];
  description?: string | null;
}): string {
  const titleLines = wrapSvgText(recipe.title || "Recipe", 18);
  const tag = recipe.tags?.[0] || recipe.description || "Gourmet Notes";
  const initial = (recipe.title || "G").trim().slice(0, 1).toLocaleUpperCase();
  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="600" y="${460 + i * 86}">${escapeSvgText(line)}</tspan>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8f1e4"/>
      <stop offset="0.52" stop-color="#efe0c7"/>
      <stop offset="1" stop-color="#d8aa83"/>
    </linearGradient>
    <radialGradient id="plate" cx="50%" cy="42%" r="55%">
      <stop offset="0" stop-color="#fff8ec"/>
      <stop offset="0.58" stop-color="#ecd3b0"/>
      <stop offset="1" stop-color="#a85d44"/>
    </radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
  </defs>
  <rect width="1200" height="900" fill="url(#paper)"/>
  <rect width="1200" height="900" filter="url(#grain)" opacity="0.35"/>
  <circle cx="600" cy="335" r="178" fill="url(#plate)" opacity="0.92"/>
  <circle cx="600" cy="335" r="128" fill="none" stroke="#fff8ec" stroke-width="18" opacity="0.55"/>
  <text x="600" y="378" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="168" fill="#5c2f25" opacity="0.48">${escapeSvgText(initial)}</text>
  <text text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-style="italic" fill="#2b1f14">${titleTspans}</text>
  <text x="600" y="735" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="7" fill="#8a503d">${escapeSvgText(String(tag).slice(0, 54).toLocaleUpperCase())}</text>
  <path d="M290 780H910" stroke="#a85d44" stroke-width="3" opacity="0.45"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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

    async function load() {
      const blob = await getRecipeImage(id);
      if (cancelled || !blob) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }
    load();

    // Re-load when a background image write finishes for this id.
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id === id) load();
    };
    window.addEventListener("gn:image-updated", onUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("gn:image-updated", onUpdate);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, storedUrl]);

  return url;
}
