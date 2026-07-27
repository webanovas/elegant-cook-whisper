import type { Recipe } from "./recipes-store";

// A minimal shareable recipe payload. We deliberately drop image blobs, notes,
// overrides, and chef consultations — the recipient gets a clean copy of the
// original recipe just like it was clipped.
export interface SharedRecipe {
  title: string;
  description: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number;
  ingredients: Recipe["ingredients"];
  instructions: string[];
  ingredient_sections?: Recipe["ingredient_sections"];
  instruction_sections?: Recipe["instruction_sections"];
  tags: string[];
  image_url: string | null;
  image_prompt: string | null;
  source_url: string | null;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeSharedRecipe(recipe: Recipe): string {
  const payload: SharedRecipe = {
    title: recipe.title,
    description: recipe.description,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    ingredient_sections: recipe.ingredient_sections,
    instruction_sections: recipe.instruction_sections,
    tags: recipe.tags,
    // Only pass through remote image URLs; skip IndexedDB blobs and data URIs.
    image_url:
      recipe.image_url && /^https?:\/\//i.test(recipe.image_url)
        ? recipe.image_url
        : null,
    image_prompt: recipe.image_prompt,
    source_url: recipe.source_url,
  };
  const json = JSON.stringify({ v: 1, r: payload });
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

export function decodeSharedRecipe(
  encoded: string,
): Omit<Recipe, "id" | "created_at" | "cookbook_id"> | null {
  try {
    const bytes = fromBase64Url(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as { v?: number; r?: SharedRecipe };
    if (!parsed?.r || typeof parsed.r.title !== "string") return null;
    const r = parsed.r;
    return {
      title: r.title,
      description: r.description ?? null,
      prep_time: r.prep_time ?? null,
      cook_time: r.cook_time ?? null,
      servings: typeof r.servings === "number" ? r.servings : 2,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      ingredient_sections: r.ingredient_sections,
      instruction_sections: r.instruction_sections,
      tags: Array.isArray(r.tags) ? r.tags : [],
      image_url: r.image_url ?? null,
      image_prompt: r.image_prompt ?? null,
      source_url: r.source_url ?? null,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(recipe: Recipe): string {
  const encoded = encodeSharedRecipe(recipe);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/import#d=${encoded}`;
}
