import { setRecipeImage, type Ingredient, type Recipe } from "./recipes-store";

type ImageEventPayload =
  | { type?: "image_generation.partial_image"; b64_json?: string }
  | { type?: "image_generation.completed"; b64_json?: string }
  | { type?: "error"; error?: { message?: string } }
  | Record<string, unknown>;

function ingredientNames(recipe: Recipe): string {
  const ingredients: Ingredient[] = recipe.ingredient_sections?.length
    ? recipe.ingredient_sections.flatMap((section) => section.items)
    : recipe.ingredients;
  return ingredients
    .map((ingredient) => ingredient.name)
    .filter(Boolean)
    .slice(0, 14)
    .join(", ");
}

export function buildRecipeHeroPrompt(recipe: Recipe): string {
  const ingredients = ingredientNames(recipe);
  const parts = [
    `Dish title: ${recipe.title}`,
    recipe.description ? `Description: ${recipe.description}` : "",
    ingredients ? `Key ingredients: ${ingredients}` : "",
    recipe.tags.length ? `Dish tags: ${recipe.tags.slice(0, 5).join(", ")}` : "",
    recipe.image_prompt ? `Recipe-specific visual cue: ${recipe.image_prompt}` : "",
  ].filter(Boolean);

  return [
    "Create a realistic, appetizing cookbook hero photograph of the finished food dish described below.",
    parts.join("\n"),
    "Show only the edible finished dish, plated or in cookware, with natural warm daylight and clean magazine-style composition.",
    "Do not show recipe pages, books, handwritten notes, ingredient lists, logos, chef hats, people, packaging, or any text in the image.",
  ]
    .join("\n")
    .slice(0, 1200);
}

function findImageLikeValue(value: unknown): string | null {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return value;
    if (/^https?:\/\//i.test(value) && /\.(png|jpe?g|webp)(\?|$)/i.test(value)) return value;
    if (/^[A-Za-z0-9+/=\n\r]+$/.test(value) && value.length > 10_000) {
      return `data:image/png;base64,${value.replace(/\s/g, "")}`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageLikeValue(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findImageLikeValue(item);
      if (found) return found;
    }
  }
  return null;
}

function eventPayloadFromBlock(block: string): { eventName: string; payload: ImageEventPayload | null } | null {
  const lines = block.split(/\r?\n/);
  let eventName = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  const data = dataLines.join("\n").trim();
  if (!data || data === "[DONE]") return null;
  try {
    return { eventName, payload: JSON.parse(data) as ImageEventPayload };
  } catch {
    return null;
  }
}

async function readImageStream(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = await res.json().catch(() => null);
    const image = findImageLikeValue(json);
    if (image) return image;
    throw new Error("Image generation returned no image");
  }

  const reader = res.body?.pipeThrough(new TextDecoderStream()).getReader();
  if (!reader) throw new Error("Image stream could not be read");

  let buffer = "";
  let latest: string | null = null;
  let completed: string | null = null;
  let streamError: string | null = null;

  function consume(block: string) {
    const event = eventPayloadFromBlock(block);
    if (!event?.payload) return;

    if (event.eventName === "error" || event.payload.type === "error") {
      streamError =
        "error" in event.payload && event.payload.error?.message
          ? event.payload.error.message
          : "Image generation failed";
      return;
    }

    const image = findImageLikeValue(event.payload);
    if (image) latest = image;
    if (event.eventName === "image_generation.completed" || event.payload.type === "image_generation.completed") {
      completed = image ?? latest;
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      blocks.forEach(consume);
    }
    if (buffer.trim()) consume(buffer);
  } finally {
    reader.cancel().catch(() => {});
  }

  if (streamError) throw new Error(streamError);
  if (completed) return completed;
  if (latest) return latest;
  throw new Error("Image stream ended without an image");
}

export async function refreshRecipeHeroImage(recipe: Recipe): Promise<void> {
  const res = await fetch("/api/generate-recipe-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: buildRecipeHeroPrompt(recipe) }),
  });

  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || `Image generation failed (${res.status})`);
  }

  const imageUrl = await readImageStream(res);
  setRecipeImage(recipe.id, imageUrl);
}