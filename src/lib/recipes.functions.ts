import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
}

function getServerSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const listRecipes = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Recipe[];
});

export const getRecipe = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Recipe not found");
    return row as unknown as Recipe;
  });

export const extractRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url("Please enter a valid URL") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchPageText, extractRecipeFromText, generateHeroImage } = await import(
      "./recipes.server"
    );
    const text = await fetchPageText(data.url);
    const extracted = await extractRecipeFromText(text, data.url);
    const imageUrl = await generateHeroImage(extracted.food_style_image_prompt);

    const supabase = getServerSupabase();
    const { data: inserted, error } = await supabase
      .from("recipes")
      .insert({
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
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as unknown as Recipe;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("recipes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
