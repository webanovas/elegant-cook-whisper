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

async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new (globalThis as any).CompressionStream("gzip");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new (globalThis as any).DecompressionStream("gzip");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function toPayload(recipe: Recipe): SharedRecipe {
  return {
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
}

function fromPayload(
  r: SharedRecipe,
): Omit<Recipe, "id" | "created_at" | "cookbook_id"> {
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
}

async function createShortShare(recipe: Recipe): Promise<string> {
  const res = await fetch("/api/public/recipe-share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipe: toPayload(recipe) }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    code?: unknown;
    error?: unknown;
  };

  if (!res.ok || typeof json.code !== "string") {
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : "Could not create a share link. Please try again.",
    );
  }

  return json.code;
}

export async function fetchSharedRecipeByCode(
  code: string,
): Promise<Omit<Recipe, "id" | "created_at" | "cookbook_id"> | null> {
  if (!/^[A-Za-z0-9_-]{8,24}$/.test(code)) return null;

  const res = await fetch(`/api/public/recipe-share?s=${encodeURIComponent(code)}`);
  if (!res.ok) return null;

  const json = (await res.json().catch(() => ({}))) as { recipe?: unknown };
  if (!json.recipe) return null;
  return fromPayload(json.recipe as SharedRecipe);
}

// Encoded formats:
//   "z" + base64url(gzip(json))  — compact, ~4-6× smaller
//   raw base64url(json)          — legacy fallback
export async function encodeSharedRecipe(recipe: Recipe): Promise<string> {
  const json = JSON.stringify({ v: 1, r: toPayload(recipe) });
  const bytes = new TextEncoder().encode(json);
  try {
    if (typeof (globalThis as any).CompressionStream === "function") {
      const gz = await gzipCompress(bytes);
      return "z" + toBase64Url(gz);
    }
  } catch {
    /* fall through to raw */
  }
  return toBase64Url(bytes);
}

export async function decodeSharedRecipe(
  encoded: string,
): Promise<Omit<Recipe, "id" | "created_at" | "cookbook_id"> | null> {
  try {
    let jsonBytes: Uint8Array;
    if (encoded.startsWith("z")) {
      jsonBytes = await gzipDecompress(fromBase64Url(encoded.slice(1)));
    } else {
      jsonBytes = fromBase64Url(encoded);
    }
    const json = new TextDecoder().decode(jsonBytes);
    const parsed = JSON.parse(json) as { v?: number; r?: SharedRecipe };
    if (!parsed?.r || typeof parsed.r.title !== "string") return null;
    return fromPayload(parsed.r);
  } catch {
    return null;
  }
}

export async function buildShareUrl(recipe: Recipe): Promise<string> {
  const code = await createShortShare(recipe);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/import?s=${code}`;
}
