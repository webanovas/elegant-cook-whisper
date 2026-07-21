import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
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

function getServerSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const chatWithGemini = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ messages: z.array(MessageSchema).min(1).max(30) }).parse(input),
  )
  .handler(async ({ data }): Promise<ChatReply> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = getServerSupabase();
    const { data: rows } = await supabase
      .from("recipes")
      .select("id, title, description, tags")
      .order("created_at", { ascending: false })
      .limit(100);

    const library = (rows ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string | null) ?? "",
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    }));

    const libraryText = library.length
      ? library
          .map(
            (r) =>
              `- id: ${r.id} | title: ${r.title}${r.tags.length ? ` | tags: ${r.tags.join(", ")}` : ""}`,
          )
          .join("\n")
      : "(the cookbook is empty)";

    const system = `You are the resident cook at Gourmet Notes, a vintage cookbook. Speak warmly, briefly, with a touch of old-world charm. Two things you do:

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

    // Parse [[RECIPE:id]] markers, resolve to titles, and strip them from the visible content.
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
