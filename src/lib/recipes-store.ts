import { useSyncExternalStore } from "react";
import { putRecipeImage, deleteRecipeImage, IDB_MARKER } from "./recipe-images";

export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  image_url: string | null;
  image_prompt: string | null;
  source_url: string | null;
  created_at: string;
  cookbook_id: string;
}

const KEY = "gourmet-notes:recipes:v1";
const DEFAULT_BOOK_ID = "general";
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function readRaw(): Recipe[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill cookbook_id for legacy entries.
    return (parsed as Array<Partial<Recipe>>).map((r) => ({
      ...(r as Recipe),
      cookbook_id: r.cookbook_id || DEFAULT_BOOK_ID,
    }));
  } catch {
    return [];
  }
}

let cache: Recipe[] = [];
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

function writeRaw(next: Recipe[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    // Quota exceeded — try to shed any lingering data-URL images to IDB and retry.
    const cleaned = next.map((r) => {
      if (r.image_url && r.image_url.startsWith("data:")) {
        putRecipeImage(r.id, r.image_url).catch(() => {});
        return { ...r, image_url: IDB_MARKER + r.id };
      }
      return r;
    });
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cleaned));
      next = cleaned;
    } catch (e2) {
      throw e2;
    }
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot(): Recipe[] {
  if (!cacheInitialized) refresh();
  return cache;
}

const EMPTY: Recipe[] = [];
function getServerSnapshot(): Recipe[] {
  return EMPTY;
}

export function useRecipes(): Recipe[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useRecipesInBook(bookId: string): Recipe[] {
  const all = useRecipes();
  return all.filter((r) => r.cookbook_id === bookId);
}

export function useRecipe(id: string): Recipe | undefined {
  const all = useRecipes();
  return all.find((r) => r.id === id);
}

export function listRecipesSync(): Recipe[] {
  return readRaw();
}

export function saveRecipe(
  recipe: Omit<Recipe, "id" | "created_at" | "cookbook_id"> & {
    id?: string;
    created_at?: string;
    cookbook_id?: string;
  },
): Recipe {
  const all = readRaw();
  const now = new Date().toISOString();
  const id = recipe.id ?? cryptoRandomId();
  const full: Recipe = {
    ...recipe,
    id,
    created_at: recipe.created_at ?? now,
    cookbook_id: recipe.cookbook_id ?? DEFAULT_BOOK_ID,
  } as Recipe;
  const next = [full, ...all.filter((r) => r.id !== id)];
  writeRaw(next);
  return full;
}

export function moveRecipeToBook(id: string, cookbook_id: string) {
  const all = readRaw();
  const next = all.map((r) => (r.id === id ? { ...r, cookbook_id } : r));
  writeRaw(next);
}

export function deleteRecipeLocal(id: string) {
  const next = readRaw().filter((r) => r.id !== id);
  writeRaw(next);
}

export function deleteRecipesInBook(bookId: string) {
  const next = readRaw().filter((r) => r.cookbook_id !== bookId);
  writeRaw(next);
}

function cryptoRandomId(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
