import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
}

export interface ExtractedRecipe {
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
}

/**
 * Fetches a URL, asks Gemini to extract the recipe, generates a hero image,
 * and returns the recipe as a plain object. The client saves it to localStorage
 * — nothing is persisted server-side.
 */
export const extractRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url("Please enter a valid URL") }).parse(input),
  )
  .handler(async ({ data }): Promise<ExtractedRecipe> => {
    const { fetchPageText, extractRecipeFromText, generateHeroImage } = await import(
      "./recipes.server"
    );
    const text = await fetchPageText(data.url);
    const extracted = await extractRecipeFromText(text, data.url);
    const imageUrl = await generateHeroImage(extracted.food_style_image_prompt);

    return {
      title: extracted.title,
      description: extracted.description,
      prep_time: extracted.prep_time,
      cook_time: extracted.cook_time,
      servings: extracted.servings,
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      tags: extracted.tags,
      image_url: imageUrl,
      image_prompt: extracted.food_style_image_prompt,
      source_url: data.url,
    };
  });

export const suggestSubstitute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ ingredient: z.string().min(1), recipeTitle: z.string().min(1) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { suggestIngredientSubstitute } = await import("./recipes.server");
    const alternatives = await suggestIngredientSubstitute(
      data.ingredient,
      data.recipeTitle,
    );
    return { alternatives };
  });
