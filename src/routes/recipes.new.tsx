import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { saveRecipe } from "@/lib/recipes-store";
import { createRecipeCoverDataUrl } from "@/lib/recipe-images";
import { refreshRecipeHeroImage } from "@/lib/recipe-hero";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/recipes/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Write a new recipe — CookNotes" },
      { name: "description", content: "Add your own recipe by hand." },
    ],
  }),
  component: NewRecipePage,
});

/** Parse "2 cups flour" → { amount: "2", unit: "cups", name: "flour" }. */
function parseIngredientLine(line: string): { amount: string; unit: string; name: string } {
  const trimmed = line.trim().replace(/^[-•*]\s*/, "");
  if (!trimmed) return { amount: "", unit: "", name: "" };
  // amount = leading number (with fraction or decimal)
  const m = trimmed.match(/^([\d]+(?:[.,/][\d]+)?(?:\s*[-–]\s*[\d]+(?:[.,/][\d]+)?)?)\s+(.*)$/);
  if (!m) return { amount: "", unit: "", name: trimmed };
  const rest = m[2].trim();
  const unitMatch = rest.match(
    /^(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|kg|ml|l|oz|lb|pieces?|כוסות?|כוס|כפות|כפית|כפיות|כף|גרם|ק"ג|קג|מ"ל|מל|ליטר)\s+(.*)$/i,
  );
  if (unitMatch) {
    return { amount: m[1], unit: unitMatch[1], name: unitMatch[2].trim() };
  }
  return { amount: m[1], unit: "", name: rest };
}

function NewRecipePage() {
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredientsText, setIngredientsText] = useState("");
  const [instructionsText, setInstructionsText] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t("manual_need_title"));
      return;
    }
    const ingredients = ingredientsText
      .split(/\r?\n/)
      .map(parseIngredientLine)
      .filter((i) => i.name);
    const instructions = instructionsText
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/^\d+[.)-]\s*/, ""))
      .filter(Boolean);
    const tagsList = tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const titleClean = title.trim();
    const descClean = description.trim() || null;
    const saved = saveRecipe({
      title: titleClean,
      description: descClean,
      prep_time: prepTime.trim() || null,
      cook_time: cookTime.trim() || null,
      servings: Number(servings) || 2,
      ingredients,
      instructions,
      tags: tagsList,
      image_url: createRecipeCoverDataUrl({
        title: titleClean,
        tags: tagsList,
        description: descClean,
      }),
      image_prompt: null,
      source_url: null,
    });
    router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
    refreshRecipeHeroImage(saved).catch((e) => console.error("manual hero image gen failed", e));
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[560px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="small-caps text-[11px] text-ink-soft hover:text-terracotta">
            ← {t("back_cookbook")}
          </Link>
          <LangToggle />
        </div>

        <header className="text-center">
          <p className="small-caps text-[11px] text-terracotta">{t("manual_kicker")}</p>
          <h1 className="mt-2 font-serif italic text-[2.4rem] leading-tight">
            {t("manual_title")}
          </h1>
          <div className="mx-auto mt-4 flex items-center gap-3 max-w-[220px]">
            <span className="flex-1 h-px bg-rule/60" />
            <span className="text-gold">❦</span>
            <span className="flex-1 h-px bg-rule/60" />
          </div>
        </header>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field label={t("manual_field_title")}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-line"
              required
            />
          </Field>
          <Field label={t("manual_field_desc")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input-line resize-none"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("prep")}>
              <input
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15m"
                className="input-line"
              />
            </Field>
            <Field label={t("cook")}>
              <input
                type="text"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30m"
                className="input-line"
              />
            </Field>
            <Field label={t("serves")}>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                className="input-line tabular-nums"
              />
            </Field>
          </div>
          <Field label={t("manual_field_ingredients")} hint={t("manual_ingredients_hint")}>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={7}
              className="input-line resize-y"
              placeholder={t("manual_ingredients_ph")}
            />
          </Field>
          <Field label={t("manual_field_steps")} hint={t("manual_steps_hint")}>
            <textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows={7}
              className="input-line resize-y"
              placeholder={t("manual_steps_ph")}
            />
          </Field>
          <Field label={t("manual_field_tags")}>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("manual_tags_ph")}
              className="input-line"
            />
          </Field>

          {error && <p className="text-xs text-destructive italic">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-ink text-paper px-4 py-3 rounded text-sm font-medium transition-transform active:scale-95"
            >
              {t("manual_save")}
            </button>
            <Link
              to="/"
              className="px-4 py-3 rounded border border-border text-sm text-ink-soft grid place-items-center"
            >
              {t("cancel")}
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        .input-line {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(0,0,0,0.15);
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
          transition: border-color .15s;
        }
        .input-line:focus { border-color: rgba(168,93,68,0.6); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="small-caps text-[10px] text-terracotta">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[10px] text-ink-soft italic">{hint}</p>}
    </label>
  );
}
