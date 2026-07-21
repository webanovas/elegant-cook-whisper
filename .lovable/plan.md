# Gourmet Notes — Implementation Plan

Mobile-first cookbook web app in the **Terracotta editorial** direction (warm white #faf9f6, charcoal #1c1917, terracotta #a85d44, Lora serif + Instrument Sans).

## Backend (Lovable Cloud)

Enable Lovable Cloud for persistence + server access to `LOVABLE_API_KEY` (Gemini).

**Table `recipes`** (public, RLS + grants):
- `id uuid pk`, `user_id uuid` (nullable — allow anon-owned for v1), `title`, `description`, `prep_time`, `cook_time`, `servings int`, `ingredients jsonb`, `instructions jsonb`, `tags text[]`, `image_url`, `image_prompt`, `source_url`, `created_at`.
- RLS: v1 open read/insert to `anon` + `authenticated` (single-user local cookbook feel). Auth can be added later; noted as a follow-up.

## Server functions (`src/lib/*.functions.ts`)

1. **`extractRecipe`** — takes `{ url }`. Fetches URL HTML server-side, strips to text, calls Gemini `google/gemini-3.5-flash` via Lovable AI Gateway with the extraction prompt, returns structured JSON. Then generates hero image via `google/gemini-3.1-flash-image` from `food_style_image_prompt`, uploads to Cloud Storage (or stores as data URL in `image_url` for v1 simplicity — use storage bucket `recipe-images`). Inserts row, returns recipe.
2. **`suggestSubstitute`** — takes `{ ingredient, recipeTitle }`. Calls Gemini with the substitution prompt, returns `{ alternatives: [{name, note}] }`.

Both handle 429/402 gateway errors and surface messages.

## Routes

- `/` — Dashboard: search bar, "Paste URL" import card, recipe grid (fade-up on load).
- `/recipes/$id` — Detail: hero image (framer-motion `layoutId` for hero animation from card), meta strip, portion scaler (± buttons animating numbers), ingredient list with Sub button per line (opens popover with alternatives), numbered instructions, floating "Start Cook Mode" button.
- `/recipes/$id/cook` — Full-screen Cook Mode: step progress bar, one step centered, timer (start/pause/reset countdown), Prev/Next with horizontal slide (framer-motion `AnimatePresence` + x transform).

Loaders use TanStack Query `ensureQueryData` + `useSuspenseQuery`.

## Interactions

- Card grid: staggered fade-up via framer-motion.
- Hero: shared `layoutId="recipe-hero-{id}"` between card image and detail hero.
- Ingredient tap: checkbox toggles strikethrough + opacity 0.4 with 300ms transition.
- Scaler: recomputes amounts (parse fractional/decimal) with animated number tween.
- Cook Mode step transition: slide x ±100% with spring.

## Design tokens (`src/styles.css`)

Replace default palette with:
- `--background: oklch(0.985 0.005 80)` (warm white)
- `--foreground: oklch(0.18 0.01 40)` (charcoal)
- `--primary: oklch(0.56 0.11 40)` (terracotta ≈ #a85d44)
- Serif `Lora`, sans `Instrument Sans` via Google Fonts `<link>` in `__root.tsx` head.

Update `__root.tsx` head to real title/description ("Gourmet Notes — Your modern cookbook").

## Dependencies

`bun add framer-motion` (already common; if `motion` preferred, use `motion`).

## Files to create/edit

```
src/styles.css                          (tokens, fonts)
src/routes/__root.tsx                   (head, fonts link)
src/routes/index.tsx                    (Dashboard)
src/routes/recipes.$id.tsx              (Detail)
src/routes/recipes.$id.cook.tsx         (Cook Mode)
src/lib/recipes.functions.ts            (extract, list, get, substitute)
src/lib/recipes.server.ts               (Gemini calls, HTML fetch)
src/components/RecipeCard.tsx
src/components/PortionScaler.tsx
src/components/IngredientRow.tsx
src/components/SubstitutePopover.tsx
src/components/CookTimer.tsx
supabase/migrations/<ts>_recipes.sql
```

## Out of scope for v1

- User auth (anyone with URL can view — noted).
- Editing recipes manually.
- Categories/folders — tags array only.
- Offline caching.

Ready to build on approval.
