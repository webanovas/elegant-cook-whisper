import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const IngredientSchema = z.object({
  amount: z.string().max(40),
  unit: z.string().max(40),
  name: z.string().max(160),
});

const IngredientSectionSchema = z.object({
  title: z.string().max(120),
  items: z.array(IngredientSchema).max(80),
});

const InstructionSectionSchema = z.object({
  title: z.string().max(120),
  steps: z.array(z.string().max(900)).max(80),
});

const SharedRecipeSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(800).nullable(),
  prep_time: z.string().max(80).nullable(),
  cook_time: z.string().max(80).nullable(),
  servings: z.number().int().min(1).max(100),
  ingredients: z.array(IngredientSchema).max(220),
  instructions: z.array(z.string().max(900)).max(220),
  ingredient_sections: z.array(IngredientSectionSchema).max(24).optional(),
  instruction_sections: z.array(InstructionSectionSchema).max(24).optional(),
  tags: z.array(z.string().max(60)).max(30),
  image_url: z.string().url().nullable(),
  image_prompt: z.string().max(600).nullable(),
  source_url: z.string().url().nullable(),
});

const CreateShareSchema = z.object({
  recipe: SharedRecipeSchema,
  image_data_url: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i)
    .max(6_000_000)
    .optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init?.headers,
    },
  });
}

function makeShareCode(length = 10): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += alphabet[byte & 63];
  return code;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/recipe-share")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("s") ?? "";
        if (!/^[A-Za-z0-9_-]{8,24}$/.test(id)) {
          return json({ error: "Invalid share link" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("recipe_shares")
          .select("recipe")
          .eq("id", id)
          .maybeSingle();

        if (error) return json({ error: "Could not open share link" }, { status: 500 });
        if (!data?.recipe) return json({ error: "Share link not found" }, { status: 404 });

        const parsed = SharedRecipeSchema.safeParse(data.recipe);
        if (!parsed.success) return json({ error: "Share link is invalid" }, { status: 422 });

        return json({ recipe: parsed.data });
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return json({ error: "Invalid request origin" }, { status: 403 });
        }

        const length = Number(request.headers.get("content-length") ?? 0);
        if (Number.isFinite(length) && length > 8_000_000) {
          return json({ error: "Recipe is too large to share" }, { status: 413 });
        }

        let input: unknown;
        try {
          input = JSON.parse(await request.text());
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error ? error.message : "Invalid request",
            },
            { status: 400 },
          );
        }

        const parsed = CreateShareSchema.safeParse(input);
        if (!parsed.success) {
          return json({ error: "Recipe is not shareable" }, { status: 422 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // If the client sent an inline image data URL, upload it to the
        // share bucket and rewrite recipe.image_url to a public URL so
        // recipients see the original photo.
        let recipeToStore = parsed.data.recipe;
        const dataUrl = parsed.data.image_data_url;
        if (dataUrl) {
          try {
            const match = /^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i.exec(dataUrl);
            if (match) {
              const mime = match[1].toLowerCase();
              const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
              const b64 = match[3];
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const path = `${makeShareCode(16)}.${ext}`;
              const { error: upErr } = await supabaseAdmin.storage
                .from("recipe-share-images")
                .upload(path, bytes, { contentType: mime, upsert: false });
              if (!upErr) {
                const { data: pub } = supabaseAdmin.storage
                  .from("recipe-share-images")
                  .getPublicUrl(path);
                if (pub?.publicUrl) {
                  recipeToStore = { ...recipeToStore, image_url: pub.publicUrl };
                }
              }
            }
          } catch {
            /* fall through — share still works, just without the image */
          }
        }

        for (let attempt = 0; attempt < 4; attempt++) {
          const id = makeShareCode();
          const { error } = await supabaseAdmin.from("recipe_shares").insert({
            id,
            recipe: recipeToStore,
          });

          if (!error) return json({ code: id }, { status: 201 });
          if (error.code !== "23505") {
            return json({ error: "Could not create share link" }, { status: 500 });
          }
        }

        return json({ error: "Could not create share link" }, { status: 500 });
      },
    },
  },
});