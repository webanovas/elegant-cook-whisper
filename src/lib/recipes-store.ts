import { useSyncExternalStore } from "react";
import { putRecipeImage, deleteRecipeImage, IDB_MARKER } from "./recipe-images";

export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
}

export interface IngredientSection {
  title: string;
  items: Ingredient[];
}

export interface InstructionSection {
  title: string;
  steps: string[];
}

export interface ChefHint {
  target: "ingredient" | "step";
  key: string; // "sectionIndex:itemIndex", sectionIndex is -1 for flat lists
  text: string;
}

export interface ChefConsultation {
  id: string;
  request: string;
  summary: string;
  hints: ChefHint[];
  created_at: string;
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
  ingredient_sections?: IngredientSection[];
  instruction_sections?: InstructionSection[];
  tags: string[];
  image_url: string | null;
  image_prompt: string | null;
  source_url: string | null;
  created_at: string;
  cookbook_id: string;
  rating?: number;
  // Personal touches — never overwrite the original recipe fields.
  personal_note?: string;
  ingredient_notes?: Record<string, string>;
  step_notes?: Record<string, string>;
  ingredient_overrides?: Record<string, string>;
  step_overrides?: Record<string, string>;
  chef_consultations?: ChefConsultation[];
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
  // One-time migration: move any legacy data-URL images into IndexedDB.
  queueMicrotask(() => {
    try {
      const all = readRaw();
      let changed = false;
      const next = all.map((r) => {
        if (r.image_url && r.image_url.startsWith("data:")) {
          putRecipeImage(r.id, r.image_url).catch(() => {});
          changed = true;
          return { ...r, image_url: IDB_MARKER + r.id };
        }
        return r;
      });
      if (changed) {
        window.localStorage.setItem(KEY, JSON.stringify(next));
        emit();
      }
    } catch {
      /* ignore */
    }
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
  let imageUrl = recipe.image_url;
  if (imageUrl && imageUrl.startsWith("data:")) {
    // Move heavy base64 images to IndexedDB so localStorage doesn't overflow.
    putRecipeImage(id, imageUrl).catch((e) => console.error("image save failed", e));
    imageUrl = IDB_MARKER + id;
  }
  const full: Recipe = {
    ...recipe,
    id,
    image_url: imageUrl,
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

export function setRecipeRating(id: string, rating: number) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  const all = readRaw();
  const next = all.map((r) => (r.id === id ? { ...r, rating: clamped } : r));
  writeRaw(next);
}

function updateRecipe(id: string, patch: (r: Recipe) => Recipe) {
  const all = readRaw();
  const next = all.map((r) => (r.id === id ? patch(r) : r));
  writeRaw(next);
}

export function setPersonalNote(id: string, note: string) {
  updateRecipe(id, (r) => ({ ...r, personal_note: note.trim() || undefined }));
}

export function setIngredientNote(id: string, key: string, note: string) {
  updateRecipe(id, (r) => {
    const map = { ...(r.ingredient_notes ?? {}) };
    if (note.trim()) map[key] = note.trim();
    else delete map[key];
    return { ...r, ingredient_notes: Object.keys(map).length ? map : undefined };
  });
}

export function setStepNote(id: string, key: string, note: string) {
  updateRecipe(id, (r) => {
    const map = { ...(r.step_notes ?? {}) };
    if (note.trim()) map[key] = note.trim();
    else delete map[key];
    return { ...r, step_notes: Object.keys(map).length ? map : undefined };
  });
}

export function setIngredientOverride(id: string, key: string, text: string) {
  updateRecipe(id, (r) => {
    const map = { ...(r.ingredient_overrides ?? {}) };
    if (text.trim()) map[key] = text.trim();
    else delete map[key];
    return { ...r, ingredient_overrides: Object.keys(map).length ? map : undefined };
  });
}

export function setStepOverride(id: string, key: string, text: string) {
  updateRecipe(id, (r) => {
    const map = { ...(r.step_overrides ?? {}) };
    if (text.trim()) map[key] = text.trim();
    else delete map[key];
    return { ...r, step_overrides: Object.keys(map).length ? map : undefined };
  });
}

export function addChefConsultation(id: string, c: Omit<ChefConsultation, "id" | "created_at">) {
  updateRecipe(id, (r) => {
    const item: ChefConsultation = {
      ...c,
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    const list = [item, ...(r.chef_consultations ?? [])].slice(0, 6);
    return { ...r, chef_consultations: list };
  });
}

export function removeChefConsultation(id: string, consultId: string) {
  updateRecipe(id, (r) => {
    const list = (r.chef_consultations ?? []).filter((c) => c.id !== consultId);
    return { ...r, chef_consultations: list.length ? list : undefined };
  });
}

export function deleteRecipeLocal(id: string) {
  const next = readRaw().filter((r) => r.id !== id);
  writeRaw(next);
  deleteRecipeImage(id);
}

export function deleteRecipesInBook(bookId: string) {
  const all = readRaw();
  const toDelete = all.filter((r) => r.cookbook_id === bookId);
  const next = all.filter((r) => r.cookbook_id !== bookId);
  writeRaw(next);
  toDelete.forEach((r) => deleteRecipeImage(r.id));
}

function cryptoRandomId(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
