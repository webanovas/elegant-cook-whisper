import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

const IngredientSchema = z.object({
  amount: z.string(),
  unit: z.string(),
  name: z.string(),
});

const IngredientSectionSchema = z.object({
  title: z.string(),
  items: z.array(IngredientSchema),
});

const InstructionSectionSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
});

export interface ChefHintOut {
  target: "ingredient" | "step";
  key: string;
  text: string;
}

export interface ConsultReply {
  summary: string;
  hints: ChefHintOut[];
}

export const consultChefOnRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        request: z.string().trim().min(2).max(500),
        lang: z.enum(["en", "he"]).optional(),
        recipe: z.object({
          title: z.string(),
          description: z.string().nullable().optional(),
          servings: z.number().optional(),
          ingredients: z.array(IngredientSchema).optional(),
          instructions: z.array(z.string()).optional(),
          ingredient_sections: z.array(IngredientSectionSchema).optional(),
          instruction_sections: z.array(InstructionSectionSchema).optional(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ConsultReply> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const ingredientLines: string[] = [];
    if (data.recipe.ingredient_sections?.length) {
      data.recipe.ingredient_sections.forEach((sec, si) => {
        sec.items.forEach((ing, i) => {
          ingredientLines.push(
            `ing ${si}:${i} — ${[ing.amount, ing.unit, ing.name].filter(Boolean).join(" ")}`,
          );
        });
      });
    } else {
      (data.recipe.ingredients ?? []).forEach((ing, i) => {
        ingredientLines.push(
          `ing -1:${i} — ${[ing.amount, ing.unit, ing.name].filter(Boolean).join(" ")}`,
        );
      });
    }

    const stepLines: string[] = [];
    if (data.recipe.instruction_sections?.length) {
      data.recipe.instruction_sections.forEach((sec, si) => {
        sec.steps.forEach((s, i) => {
          stepLines.push(`step ${si}:${i} — ${s}`);
        });
      });
    } else {
      (data.recipe.instructions ?? []).forEach((s, i) => {
        stepLines.push(`step -1:${i} — ${s}`);
      });
    }

    const langLine =
      data.lang === "he"
        ? "Reply strictly in natural Hebrew."
        : "Reply strictly in English.";

    const system = `You are the resident cook at CookNotes. The user wants advice on how to adapt a saved recipe (e.g. make it vegan, less spicy, gluten-free, for two people). Give warm, concrete tips. ${langLine}

You MUST reply with a single JSON object and nothing else. Shape:
{
  "summary": "1–3 short sentences summarizing the adaptation.",
  "hints": [
    { "target": "ingredient" | "step", "key": "<sectionIndex>:<itemIndex>", "text": "short tip shown inline next to that item" }
  ]
}

Rules:
- Only reference ingredients/steps that appear in the inventory below, using their EXACT key like "0:2" or "-1:3". Never invent keys.
- Keep each hint to one short sentence (under ~120 chars).
- Include 0–8 hints — only attach a hint where it clearly helps.
- If nothing specific needs changing, return an empty hints array and explain in the summary.
- Do NOT rewrite the whole recipe. Do NOT include markdown or code fences.`;

    const user = `Recipe: ${data.recipe.title}
${data.recipe.description ? `Description: ${data.recipe.description}\n` : ""}Servings: ${data.recipe.servings ?? "?"}

Ingredients:
${ingredientLines.join("\n") || "(none)"}

Steps:
${stepLines.join("\n") || "(none)"}

User request: ${data.request}`;

    const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429)
      throw new Error("The kitchen is a bit busy — try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in workspace billing.");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error [${res.status}]: ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";

    let parsed: { summary?: unknown; hints?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { summary: raw.trim().slice(0, 800), hints: [] };
    }

    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const hintsArr = Array.isArray(parsed.hints) ? parsed.hints : [];
    const hints: ChefHintOut[] = [];
    for (const h of hintsArr) {
      if (!h || typeof h !== "object") continue;
      const target = (h as { target?: unknown }).target;
      const key = (h as { key?: unknown }).key;
      const text = (h as { text?: unknown }).text;
      if (
        (target === "ingredient" || target === "step") &&
        typeof key === "string" &&
        /^-?\d+:\d+$/.test(key) &&
        typeof text === "string" &&
        text.trim()
      ) {
        hints.push({ target, key, text: text.trim() });
      }
    }
    return { summary, hints };
  });
