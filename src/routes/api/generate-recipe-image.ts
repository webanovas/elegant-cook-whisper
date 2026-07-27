import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ImageRequest = z.object({
  prompt: z.string().trim().min(1).max(1200),
});

export const Route = createFileRoute("/api/generate-recipe-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = ImageRequest.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Missing recipe image prompt" }, { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "Image generation is not configured" }, { status: 500 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [
              {
                role: "user",
                content: parsed.data.prompt,
              },
            ],
            modalities: ["image", "text"],
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const body = await upstream.text().catch(() => "");
          return new Response(body || "Image generation failed", {
            status: upstream.status,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});