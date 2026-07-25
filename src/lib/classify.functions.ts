import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

const BookSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string().nullable().optional(),
});

export interface ClassifyResult {
  bookId: string | null;
  suggestedNewBook: string | null;
}

/**
 * Given a recipe (title/description/tags) and a list of existing cookbooks,
 * asks Gemini to pick the best-fitting book id, or suggest a new book name
 * if nothing fits. Falls back to null on any error (caller decides default).
 */
export const classifyRecipeIntoBook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string(),
        description: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        books: z.array(BookSchema).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { bookId: null, suggestedNewBook: null };
    if (data.books.length === 0) {
      return { bookId: null, suggestedNewBook: null };
    }

    const list = data.books
      .map(
        (b) =>
          `- id: ${b.id} | name: ${b.name}${b.subtitle ? ` — ${b.subtitle}` : ""}`,
      )
      .join("\n");

    const prompt = `You sort recipes into cookbooks on a private kitchen shelf.

Existing cookbooks:
${list}

Recipe to sort:
title: ${data.title}
description: ${data.description ?? ""}
tags: ${(data.tags ?? []).join(", ")}

Pick the ONE existing cookbook that best fits. If nothing fits well, suggest a short new cookbook name (2-3 words, title case).

Return ONLY strict JSON with this shape, no fences:
{"bookId": "<existing id or null>", "suggestedNewBook": "<new name or null>"}`;

    try {
      const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return { bookId: null, suggestedNewBook: null };
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = (json.choices?.[0]?.message?.content ?? "").trim();
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      const parsed = JSON.parse(cleaned) as {
        bookId?: string | null;
        suggestedNewBook?: string | null;
      };
      const validId =
        parsed.bookId && data.books.some((b) => b.id === parsed.bookId)
          ? parsed.bookId
          : null;
      return {
        bookId: validId,
        suggestedNewBook:
          !validId && parsed.suggestedNewBook ? parsed.suggestedNewBook : null,
      };
    } catch {
      return { bookId: null, suggestedNewBook: null };
    }
  });

const VibeRecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  prep_time: z.string().nullable().optional(),
  cook_time: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
});

/**
 * Given a natural-language "vibe" and a compact list of the user's recipes,
 * asks Gemini for the ordered ids that best match. Returns [] on any error so
 * the UI can gracefully fall back to the previous sort.
 */
export const filterRecipesByVibe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        vibe: z.string().trim().min(2).max(200),
        recipes: z.array(VibeRecipeSchema).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ids: string[]; note: string | null }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key || data.recipes.length === 0) return { ids: [], note: null };

    const compact = data.recipes
      .map(
        (r) =>
          `${r.id} | ${r.title} | tags:${(r.tags ?? []).join(",")} | prep:${r.prep_time ?? "?"} | cook:${r.cook_time ?? "?"} | ${r.rating ? `${r.rating}★` : "unrated"}${r.description ? ` | ${r.description.slice(0, 90)}` : ""}`,
      )
      .join("\n");

    const prompt = `You help someone pick a recipe from their private cookbook to match a mood.

Vibe / request: "${data.vibe}"

Their recipes (id | title | tags | prep | cook | rating | desc):
${compact}

Pick up to 12 recipes that best match the vibe, ordered from best to worst fit. If nothing really matches, return an empty list.

Return ONLY strict JSON, no fences:
{"ids": ["<id>", ...], "note": "<one short warm sentence explaining the pick, max 90 chars>"}`;

    try {
      const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return { ids: [], note: null };
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = (json.choices?.[0]?.message?.content ?? "").trim();
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      const parsed = JSON.parse(cleaned) as { ids?: unknown; note?: unknown };
      const known = new Set(data.recipes.map((r) => r.id));
      const ids = Array.isArray(parsed.ids)
        ? (parsed.ids as unknown[])
            .filter((x): x is string => typeof x === "string" && known.has(x))
            .slice(0, 12)
        : [];
      const note = typeof parsed.note === "string" ? parsed.note.slice(0, 140) : null;
      return { ids, note };
    } catch {
      return { ids: [], note: null };
    }
  });
