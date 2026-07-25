import { useSyncExternalStore } from "react";

export interface GroceryItem {
  id: string;
  amount: string;
  unit: string;
  name: string;
  recipe_title: string | null;
  checked: boolean;
  created_at: string;
}

const KEY = "gourmet-notes:grocery:v1";
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function readRaw(): GroceryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GroceryItem[]) : [];
  } catch {
    return [];
  }
}

let cache: GroceryItem[] = [];
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

function writeRaw(next: GroceryItem[]) {
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

function getSnapshot(): GroceryItem[] {
  if (!cacheInitialized) refresh();
  return cache;
}

const EMPTY: GroceryItem[] = [];
function getServerSnapshot(): GroceryItem[] {
  return EMPTY;
}

export function useGrocery(): GroceryItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function randId(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addGroceryItem(
  item: Omit<GroceryItem, "id" | "checked" | "created_at">,
) {
  const all = readRaw();
  const now = new Date().toISOString();
  const norm = item.name.trim().toLowerCase();
  // Merge into an existing unchecked item with same name if it exists.
  const existingIdx = all.findIndex(
    (i) => !i.checked && i.name.trim().toLowerCase() === norm,
  );
  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    // Prefer to keep the older entry but append amounts when they differ.
    const nextAmount =
      existing.amount && item.amount && existing.amount !== item.amount
        ? `${existing.amount} + ${item.amount}${item.unit ? " " + item.unit : ""}`
        : existing.amount || item.amount;
    const merged: GroceryItem = {
      ...existing,
      amount: nextAmount,
      unit: existing.unit || item.unit,
    };
    const next = [...all];
    next[existingIdx] = merged;
    writeRaw(next);
    return merged;
  }
  const full: GroceryItem = {
    id: randId(),
    checked: false,
    created_at: now,
    amount: item.amount,
    unit: item.unit,
    name: item.name,
    recipe_title: item.recipe_title,
  };
  writeRaw([full, ...all]);
  return full;
}

export function addGroceryItems(
  items: Array<Omit<GroceryItem, "id" | "checked" | "created_at">>,
) {
  items.forEach((i) => {
    if (i.name.trim()) addGroceryItem(i);
  });
}

export function toggleGrocery(id: string) {
  const all = readRaw();
  writeRaw(all.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
}

export function removeGrocery(id: string) {
  writeRaw(readRaw().filter((i) => i.id !== id));
}

export function clearChecked() {
  writeRaw(readRaw().filter((i) => !i.checked));
}

export function clearAllGrocery() {
  writeRaw([]);
}
