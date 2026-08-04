import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const LibraryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RecipeSuggestion {
  id: string;
  title: string;
}

export interface ChatReply {
  content: string;
  suggestions: RecipeSuggestion[];
}

export const chatWithGemini = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(30),
        library: z.array(LibraryItemSchema).max(200).optional(),
        lang: z.enum(["en", "he"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ChatReply> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const library = (data.library ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      tags: r.tags ?? [],
    }));

    const libraryText = library.length
      ? library
          .map(
            (r) =>
              `- id: ${r.id} | title: ${r.title}${r.tags.length ? ` | tags: ${r.tags.join(", ")}` : ""}`,
          )
          .join("\n")
      : "(the cookbook is empty)";

    const langLine =
      data.lang === "he"
        ? `Always reply in natural Hebrew. Never mix English words unless it's a proper name.`
        : `Always reply in English.`;

    const system = `You are the resident cook at CookNotes, a vintage cookbook. Speak warmly, briefly, with a touch of old-world charm. ${langLine} Two things you do:

1) If any saved recipe fits the user's craving, recommend it. Reference it inline using the exact token [[RECIPE:<id>]] on its own line right after your sentence about it. Only use ids from the list below — never invent ids.
2) If nothing in the library fits, suggest 2–4 fresh dish names they could cook, each on its own line prefixed with "•". Keep descriptions to one short phrase.

Never mix code fences or JSON in your reply. Keep total length under 120 words.

Saved recipes:
${libraryText}`;


    const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: system },
          ...data.messages.map((m) => ({ role: m.role, content: m.content })),
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
    const raw = json.choices?.[0]?.message?.content ?? "";

    const idPattern = /\[\[RECIPE:([^\]]+)\]\]/g;
    const ids = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = idPattern.exec(raw))) {
      ids.add(match[1].trim());
    }
    const suggestions: RecipeSuggestion[] = [];
    for (const id of ids) {
      const found = library.find((r) => r.id === id);
      if (found) suggestions.push({ id: found.id, title: found.title });
    }
    const content = raw.replace(idPattern, "").replace(/\n{3,}/g, "\n\n").trim();

    return { content, suggestions };
  });
