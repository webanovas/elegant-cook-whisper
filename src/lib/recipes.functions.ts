import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
}

export const extractRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        url: z.string().url("Please enter a valid URL"),
        lang: z.enum(["en", "he"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ExtractedRecipe> => {
    const { fetchPageText, extractRecipeFromText } = await import("./recipes.server");
    const text = await fetchPageText(data.url);
    const extracted = await extractRecipeFromText(text, data.url, data.lang ?? "en");

    // Hero image is generated separately (generateRecipeImage) so clipping
    // returns as fast as possible — image gen is the slowest step.
    return {
      title: extracted.title,
      description: extracted.description,
      prep_time: extracted.prep_time,
      cook_time: extracted.cook_time,
      servings: extracted.servings,
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      ingredient_sections: extracted.ingredient_sections,
      instruction_sections: extracted.instruction_sections,
      tags: extracted.tags,
      image_url: null,
      image_prompt: extracted.food_style_image_prompt,
      source_url: data.url,
    };
});

export const generateRecipeImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ prompt: z.string().min(1).max(1000) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ image_url: string | null }> => {
    const { generateHeroImage } = await import("./recipes.server");
    const image_url = await generateHeroImage(data.prompt);
    return { image_url };
  });

export interface ScannedRecipeResult extends ExtractedRecipe {
  confidence: number;
  warnings: string[];
}

export const scanRecipeFromImages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        images: z
          .array(z.string().min(20))
          .min(1, "Please add at least one photo")
          .max(6),
        lang: z.enum(["en", "he"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ScannedRecipeResult> => {
    const { extractRecipeFromImages } = await import("./recipes.server");
    const scanned = await extractRecipeFromImages(data.images, data.lang ?? "en");
    return {
      title: scanned.title,
      description: scanned.description,
      prep_time: scanned.prep_time,
      cook_time: scanned.cook_time,
      servings: scanned.servings,
      ingredients: scanned.ingredients,
      instructions: scanned.instructions,
      ingredient_sections: scanned.ingredient_sections,
      instruction_sections: scanned.instruction_sections,
      tags: scanned.tags,
      image_url: null,
      image_prompt: scanned.food_style_image_prompt,
      source_url: null,
      confidence: scanned.confidence,
      warnings: scanned.warnings,
    };
  });


export interface WebRecipeResult {
  title: string;
  url: string;
  description: string | null;
  source: string | null;
  rating: number | null;
  reviews: number | null;
}

/** Pull a rating like 4.7 and review count from messy title/description text. */
function extractRating(...parts: (string | null | undefined)[]): {
  rating: number | null;
  reviews: number | null;
} {
  const text = parts.filter(Boolean).join(" · ");
  let rating: number | null = null;
  let reviews: number | null = null;

  const rMatch =
    text.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|out of\s*5|stars?|★)/i) ??
    text.match(/★\s*(\d(?:\.\d)?)/) ??
    text.match(/rating[:\s]+(\d(?:\.\d)?)/i);
  if (rMatch) {
    const n = parseFloat(rMatch[1]);
    if (n >= 0 && n <= 5) rating = n;
  }

  const revMatch =
    text.match(/\(([\d,]+)\)/) ??
    text.match(/(\d[\d,]*)\s*(?:reviews?|ratings?|votes?)/i);
  if (revMatch) {
    const n = parseInt(revMatch[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n)) reviews = n;
  }

  return { rating, reviews };
}

export const searchRecipesOnWeb = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(2).max(120) }).parse(input),
  )
  .handler(async ({ data }): Promise<WebRecipeResult[]> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const fcKey = process.env.FIRECRAWL_API_KEY;
    if (!lovableKey || !fcKey) throw new Error("Recipe search is not configured.");

    const res = await fetch(
      "https://connector-gateway.lovable.dev/firecrawl/v2/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": fcKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${data.query} recipe rating reviews`,
          limit: 8,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Search failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?:
        | { web?: Array<{ url: string; title?: string; description?: string }> }
        | Array<{ url: string; title?: string; description?: string }>;
    };
    const rows = Array.isArray(json.data)
      ? json.data
      : (json.data?.web ?? []);
    return rows
      .filter((r) => r.url)
      .slice(0, 8)
      .map((r) => {
        let source: string | null = null;
        try {
          source = new URL(r.url).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
        const { rating, reviews } = extractRating(r.title, r.description);
        return {
          title: r.title ?? r.url,
          url: r.url,
          description: r.description ?? null,
          source,
          rating,
          reviews,
        };
      });
  });

export const suggestSubstitute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        ingredient: z.string().min(1),
        recipeTitle: z.string().min(1),
        exclude: z.array(z.string()).optional(),
        count: z.number().int().min(1).max(4).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { suggestIngredientSubstitute } = await import("./recipes.server");
    const alternatives = await suggestIngredientSubstitute(
      data.ingredient,
      data.recipeTitle,
      data.exclude ?? [],
      data.count ?? 2,
    );
    return { alternatives };
  });

