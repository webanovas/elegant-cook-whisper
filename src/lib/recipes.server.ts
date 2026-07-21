// Server-only helpers for AI + Supabase writes. Never imported from client code.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export interface ExtractedRecipe {
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  ingredients: Array<{ amount: string; unit: string; name: string }>;
  instructions: string[];
  tags: string[];
  food_style_image_prompt: string;
}

async function callGemini(prompt: string, model: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (res.status === 429) throw new Error("Rate limit reached, try again in a moment.");
  if (res.status === 402)
    throw new Error("AI credits exhausted. Add credits in your workspace billing.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway error [${res.status}]: ${text}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function stripJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function htmlToText(html: string): string {
  // Strip scripts/styles, then tags. Keep it simple; Gemini handles the rest.
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = noScripts.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 18000);
}

export async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GourmetNotesBot/1.0; +https://gourmet-notes.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Could not fetch that URL (status ${res.status}).`);
  const html = await res.text();
  return htmlToText(html);
}

export async function extractRecipeFromText(
  pageText: string,
  sourceUrl: string,
): Promise<ExtractedRecipe> {
  const prompt = `Extract the recipe from this content. Return ONLY a clean JSON object (no markdown fences, no commentary) with these exact keys:
- title (string)
- description (short overview, 1-2 sentences)
- prep_time (string like "15m")
- cook_time (string like "30m")
- servings (integer)
- ingredients (array of objects with 'amount', 'unit', 'name'; empty strings if not specified)
- instructions (array of clear step-by-step strings)
- tags (array of short tags like "Vegan", "Italian", "Quick")
- food_style_image_prompt (a description for generating an aesthetic, editorial food photography image of this dish)

Source URL: ${sourceUrl}

Content:
${pageText}`;

  const raw = await callGemini(prompt, "google/gemini-3.5-flash");
  const cleaned = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(cleaned) as ExtractedRecipe;
    // Basic sanity
    if (!parsed.title) throw new Error("No title found");
    return {
      title: parsed.title,
      description: parsed.description ?? "",
      prep_time: parsed.prep_time ?? "",
      cook_time: parsed.cook_time ?? "",
      servings: Number(parsed.servings) || 2,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      food_style_image_prompt: parsed.food_style_image_prompt ?? parsed.title,
    };
  } catch (e) {
    throw new Error(
      `Could not parse recipe. The page may not contain a recipe. (${(e as Error).message})`,
    );
  }
}

export async function generateHeroImage(prompt: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Editorial food photography, natural light, soft warm palette, magazine-quality composition. ${prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url ?? null;
  } catch (e) {
    console.error("Hero image generation failed:", e);
    return null;
  }
}

export async function suggestIngredientSubstitute(
  ingredient: string,
  recipeTitle: string,
): Promise<Array<{ name: string; note: string }>> {
  const prompt = `A user needs a substitute for "${ingredient}" in "${recipeTitle}". Suggest 2 practical, easy-to-find alternatives and briefly explain how each slightly changes the flavor or cooking. Return ONLY JSON (no fences) in this exact shape:
{"alternatives":[{"name":"...","note":"..."},{"name":"...","note":"..."}]}`;

  const raw = await callGemini(prompt, "google/gemini-3.5-flash");
  const cleaned = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(cleaned) as {
      alternatives?: Array<{ name: string; note: string }>;
    };
    return parsed.alternatives ?? [];
  } catch {
    return [];
  }
}
