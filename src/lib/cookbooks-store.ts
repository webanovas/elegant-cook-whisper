import { useSyncExternalStore } from "react";

export interface Cookbook {
  id: string;
  name: string;
  subtitle: string | null;
  emoji: string;
  hue: number; // 0-360 for cover tint
  created_at: string;
}

const KEY = "gourmet-notes:cookbooks:v1";
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function readRaw(): Cookbook[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Cookbook[]) : [];
  } catch {
    return [];
  }
}

let cache: Cookbook[] = [];
let cacheInitialized = false;

function refresh() {
  cache = readRaw();
  cacheInitialized = true;
}

function emit() {
  refresh();
  listeners.forEach((l) => l());
}

if (isBrowser()) {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

function writeRaw(next: Cookbook[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot(): Cookbook[] {
  if (!cacheInitialized) refresh();
  return cache;
}

const EMPTY: Cookbook[] = [];
function getServerSnapshot(): Cookbook[] {
  return EMPTY;
}

export const GENERAL_BOOK: Cookbook = {
  id: "general",
  name: "The Kitchen",
  subtitle: "everything, unsorted",
  emoji: "❦",
  hue: 30,
  created_at: "1970-01-01T00:00:00.000Z",
};

export function useCookbooks(): Cookbook[] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [GENERAL_BOOK, ...stored];
}

export function useCookbook(id: string): Cookbook | undefined {
  const books = useCookbooks();
  return books.find((b) => b.id === id);
}

export function listCookbooksSync(): Cookbook[] {
  return [GENERAL_BOOK, ...readRaw()];
}

export function createCookbook(input: {
  name: string;
  subtitle?: string;
  emoji?: string;
  hue?: number;
}): Cookbook {
  const all = readRaw();
  const book: Cookbook = {
    id: cryptoRandomId(),
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() || null,
    emoji: input.emoji || pickEmoji(input.name),
    hue: typeof input.hue === "number" ? input.hue : pickHue(),
    created_at: new Date().toISOString(),
  };
  writeRaw([...all, book]);
  return book;
}

export function deleteCookbook(id: string) {
  if (id === GENERAL_BOOK.id) return;
  writeRaw(readRaw().filter((b) => b.id !== id));
}

function pickEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/cook|biscuit|בישקוט|עוגי/.test(n)) return "🍪";
  if (/pasta|noodle|פסטה|אטריות/.test(n)) return "🍝";
  if (/bread|לחם|challah|חלה/.test(n)) return "🥖";
  if (/cake|עוגה|dessert|קינוח/.test(n)) return "🍰";
  if (/soup|מרק/.test(n)) return "🥣";
  if (/salad|סלט/.test(n)) return "🥗";
  if (/breakfast|בוקר/.test(n)) return "🍳";
  if (/drink|שתיה|cocktail/.test(n)) return "🍷";
  if (/meat|בשר|steak/.test(n)) return "🥩";
  if (/fish|דג/.test(n)) return "🐟";
  return "❦";
}

const HUES = [18, 30, 45, 90, 140, 200, 260, 340];
function pickHue(): number {
  return HUES[Math.floor(Math.random() * HUES.length)];
}

function cryptoRandomId(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
