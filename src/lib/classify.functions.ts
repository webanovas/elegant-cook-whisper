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
