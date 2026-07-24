// Server-only helpers for AI + Supabase writes. Never imported from client code.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

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

export interface ExtractedRecipe {
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  ingredient_sections?: IngredientSection[];
  instruction_sections?: InstructionSection[];
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
  // Prefer Firecrawl (bypasses bot walls, returns clean markdown).
  const lovableKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  let firecrawlError: string | null = null;
  if (lovableKey && fcKey) {
    try {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/firecrawl/v2/scrape",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": fcKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 1500,
          }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          markdown?: string;
          data?: { markdown?: string };
        };
        const md = json.markdown ?? json.data?.markdown;
        if (md && md.trim().length > 0) return md.slice(0, 18000);
        firecrawlError = "Firecrawl returned an empty page.";
      } else {
        const body = await res.text().catch(() => "");
        firecrawlError = `Firecrawl [${res.status}] ${body.slice(0, 200)}`;
        console.error("Firecrawl scrape failed:", firecrawlError);
      }
    } catch (e) {
      firecrawlError = (e as Error).message;
      console.error("Firecrawl scrape threw:", firecrawlError);
    }
  }

  // Fallback: direct fetch with a real browser User-Agent (many sites 403 bots).
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    const suffix = firecrawlError ? ` (fallback also failed: ${firecrawlError})` : "";
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      throw new Error(
        `That site is blocking automated readers (status ${res.status}). Try a different recipe URL, or use the "search the web" tab instead.${suffix}`,
      );
    }
    throw new Error(`Could not fetch that URL (status ${res.status}).${suffix}`);
  }
  const html = await res.text();
  const text = htmlToText(html);
  if (text.length < 200) {
    throw new Error(
      "That page didn't have enough readable content to extract a recipe. Try the search-the-web tab.",
    );
  }
  return text;
}


export async function extractRecipeFromText(
  pageText: string,
  sourceUrl: string,
): Promise<ExtractedRecipe> {
  const prompt = `Extract the recipe from this content. Return ONLY a clean JSON object (no markdown fences, no commentary) with these exact keys:
- title (string) — keep it in its original language.
- description (short overview, 1-2 sentences, in the recipe's original language)
- prep_time (string like "15m")
- cook_time (string like "30m")
- servings (integer)
- ingredients (array of objects with 'amount', 'unit', 'name'; empty strings if not specified) — FLAT list of every ingredient
- instructions (array of clear step-by-step strings) — FLAT list of every step
- tags (array of short tags like "Vegan", "Italian", "Quick")
- food_style_image_prompt (a description in English for generating an aesthetic, editorial food photography image of this dish)

If — and ONLY if — the recipe has clearly labelled multiple components (e.g. "For the meatballs" + "For the sauce", cake + frosting, dough + filling), also return:
- ingredient_sections: array of { title: string, items: [{amount, unit, name}, ...] }
- instruction_sections: array of { title: string, steps: [string, ...] }
Use the recipe's own section labels for 'title'. The flat 'ingredients' and 'instructions' arrays must still contain every item across all sections, in order — they are used for cook mode. Omit ingredient_sections / instruction_sections entirely when the recipe is a single component.

Source URL: ${sourceUrl}

Content:
${pageText}`;

  const raw = await callGemini(prompt, "google/gemini-3.5-flash");
  const cleaned = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(cleaned) as ExtractedRecipe;
    if (!parsed.title) throw new Error("No title found");

    const iSections = Array.isArray(parsed.ingredient_sections)
      ? parsed.ingredient_sections.filter((s) => s && Array.isArray(s.items))
      : undefined;
    const sSections = Array.isArray(parsed.instruction_sections)
      ? parsed.instruction_sections.filter((s) => s && Array.isArray(s.steps))
      : undefined;

    // Derive flat lists from sections if the model forgot them.
    const flatIngredients =
      Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
        ? parsed.ingredients
        : iSections
          ? iSections.flatMap((s) => s.items)
          : [];
    const flatInstructions =
      Array.isArray(parsed.instructions) && parsed.instructions.length > 0
        ? parsed.instructions
        : sSections
          ? sSections.flatMap((s) => s.steps)
          : [];

    return {
      title: parsed.title,
      description: parsed.description ?? "",
      prep_time: parsed.prep_time ?? "",
      cook_time: parsed.cook_time ?? "",
      servings: Number(parsed.servings) || 2,
      ingredients: flatIngredients,
      instructions: flatInstructions,
      ingredient_sections: iSections && iSections.length > 0 ? iSections : undefined,
      instruction_sections: sSections && sSections.length > 0 ? sSections : undefined,
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
