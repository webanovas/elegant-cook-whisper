import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { deleteRecipeLocal, setRecipeRating, useRecipe } from "@/lib/recipes-store";
import { useRecipeImage } from "@/lib/recipe-images";
import { PortionScaler } from "@/components/PortionScaler";
import { IngredientRow } from "@/components/IngredientRow";
import { StarRating } from "@/components/StarRating";
import { useT } from "@/lib/i18n";
import { TimedText } from "@/components/TimedText";
import { addGroceryItems } from "@/lib/grocery-store";
import { scaleAmount } from "@/lib/scale";

export const Route = createFileRoute("/recipes/$id")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Recipe — Gourmet Notes" }],
  }),
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const recipe = useRecipe(id);
  const router = useRouter();
  const t = useT();
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [addedAll, setAddedAll] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [scanNotice, setScanNotice] = useState<
    { confidence: number; warnings: string[] } | null
  >(null);
  const imgSrc = useRecipeImage(recipe?.id ?? "", recipe?.image_url ?? null);

  useEffect(() => {
    if (!recipe) return;
    try {
      const raw = window.sessionStorage.getItem(`gn:scan-notice:${recipe.id}`);
      if (raw) setScanNotice(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [recipe]);

  function dismissScanNotice() {
    if (!recipe) return;
    try {
      window.sessionStorage.removeItem(`gn:scan-notice:${recipe.id}`);
    } catch {
      /* ignore */
    }
    setScanNotice(null);
  }

  if (!recipe) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center">
          <p className="font-serif text-xl">{t("recipe_not_found")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("not_on_device")}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            {t("back_cookbook")}
          </Link>
        </div>
      </div>
    );
  }

  function onDelete() {
    if (!confirm(t("confirm_delete_recipe"))) return;
    deleteRecipeLocal(recipe!.id);
    router.navigate({ to: "/" });
  }

  function onAddAllToGrocery() {
    if (!recipe) return;
    const originalServings = recipe.servings || 2;
    const flat = recipe.ingredient_sections
      ? recipe.ingredient_sections.flatMap((s) => s.items)
      : recipe.ingredients;
    addGroceryItems(
      flat.map((ing) => ({
        amount: scaleAmount(ing.amount ?? "", originalServings, servings) || ing.amount,
        unit: ing.unit,
        name: ing.name,
        recipe_title: recipe.title,
      })),
    );
    setAddedAll(true);
    window.setTimeout(() => setAddedAll(false), 1600);
  }



  const iSections = recipe.ingredient_sections;
  const sSections = recipe.instruction_sections;

  return (
    <div className={`min-h-screen bg-background text-foreground pb-32 ${cookMode ? "cook-mode-on text-[1.08rem]" : ""}`}>
      <div className="max-w-[440px] mx-auto relative">
        {cookMode && (
          <button
            type="button"
            onClick={() => setCookMode(false)}
            className="fixed top-3 end-3 z-50 rounded-full bg-foreground/90 text-background text-xs font-medium px-4 py-2 shadow-lg backdrop-blur-md hover:bg-foreground transition-colors"
          >
            × {t("exit_cook")}
          </button>
        )}
        {/* Hero */}
        <div className="relative">
          <div className="w-full aspect-[4/5] bg-muted overflow-hidden">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={recipe.title}
                className="w-full h-full object-cover"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-muted to-secondary">
                <span className="font-serif italic text-6xl text-muted-foreground/30">
                  {recipe.title.slice(0, 1)}
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
          <Link
            to="/"
            className="absolute top-4 start-4 bg-background/80 backdrop-blur-md size-9 rounded-full grid place-items-center text-sm shadow-sm"
            aria-label="Back"
          >
            ←
          </Link>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="px-6 -mt-16 relative z-10"
        >
          {recipe.tags[0] && (
            <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-medium mb-4 uppercase tracking-widest">
              {recipe.tags[0]}
            </div>
          )}
          <h1 className="font-serif text-4xl leading-tight text-balance mb-3">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground italic text-pretty mb-4">
              {recipe.description}
            </p>
          )}
          <div className="mb-6 flex items-center gap-3">
            <span className="small-caps text-[10px] text-ink-soft">{t("your_rating")}</span>
            <StarRating
              value={recipe.rating ?? 0}
              onChange={(v) => setRecipeRating(recipe.id, v)}
              size="md"
            />
          </div>

          <div className="flex justify-between py-6 border-y border-border">
            <MetaCell label={t("prep")} value={recipe.prep_time || "—"} />
            <div className="w-px bg-border" />
            <MetaCell label={t("cook")} value={recipe.cook_time || "—"} />
            <div className="w-px bg-border" />
            <div className="text-center">
              <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                {t("serves")}
              </span>
              <PortionScaler servings={servings} onChange={setServings} />
            </div>
          </div>

          {scanNotice && (
            <div className="mt-6 rounded border border-terracotta/40 bg-terracotta/5 p-3 text-[12px] text-ink">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="small-caps text-[10px] text-terracotta font-semibold">
                    {scanNotice.confidence < 0.6
                      ? t("scan_low_conf")
                      : t("scan_medium_conf")}
                  </p>
                  <p className="mt-1 italic">{t("scan_review_hint")}</p>
                  {scanNotice.warnings.length > 0 && (
                    <ul className="mt-2 list-disc ps-4 space-y-0.5">
                      {scanNotice.warnings.map((w, i) => (
                        <li key={i} className="text-ink-soft">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismissScanNotice}
                  aria-label={t("close")}
                  className="text-ink-soft/60 hover:text-terracotta text-lg leading-none px-1"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <section className="py-8">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="font-serif text-xl">{t("ingredients")}</h3>
              <button
                type="button"
                onClick={onAddAllToGrocery}
                className="small-caps text-[10px] text-terracotta border border-terracotta/40 rounded-full px-3 py-1 hover:bg-terracotta hover:text-paper transition-colors"
              >
                {addedAll ? `✓ ${t("added")}` : `🛒 ${t("add_all_grocery")}`}
              </button>
            </div>
            {iSections && iSections.length > 0 ? (
              <div className="space-y-8">
                {iSections.map((sec, si) => (
                  <div key={si}>
                    <p className="small-caps text-[11px] text-terracotta mb-3">
                      {sec.title}
                    </p>
                    <ul className="space-y-4">
                      {sec.items.map((ing, i) => (
                        <IngredientRow
                          key={i}
                          ingredient={ing}
                          originalServings={recipe.servings || 2}
                          currentServings={servings}
                          recipeTitle={recipe.title}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : recipe.ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{t("no_ingredients")}</p>
            ) : (
              <ul className="space-y-4">
                {recipe.ingredients.map((ing, i) => (
                  <IngredientRow
                    key={i}
                    ingredient={ing}
                    originalServings={recipe.servings || 2}
                    currentServings={servings}
                    recipeTitle={recipe.title}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="pb-8">
            <h3 className="font-serif text-xl mb-6">{t("method")}</h3>
            {sSections && sSections.length > 0 ? (
              <div className="space-y-10">
                {sSections.map((sec, si) => (
                  <div key={si}>
                    <p className="small-caps text-[11px] text-terracotta mb-4">
                      {sec.title}
                    </p>
                    <div className="space-y-8">
                      {sec.steps.map((step, i) => (
                        <StepLine key={i} n={i + 1} text={step} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {recipe.instructions.map((step, i) => (
                  <StepLine key={i} n={i + 1} text={step} />
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground pt-6 border-t border-border">
            {recipe.source_url ? (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {t("original_source")}
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onDelete}
              className="text-destructive/70 hover:text-destructive"
            >
              {t("delete")}
            </button>
          </div>
        </motion.div>

        {!cookMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[392px] z-50">
            <button
              type="button"
              onClick={() => {
                setCookMode(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full bg-foreground text-background py-4 rounded-full font-medium text-sm flex items-center justify-center gap-2 shadow-xl ring-1 ring-foreground/10"
            >
              {t("start_cook")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLine({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-4">
      <span
        dir="ltr"
        className="font-serif text-primary/40 text-2xl leading-none italic tabular-nums shrink-0"
      >
        {String(n).padStart(2, "0")}
      </span>
      <p className="text-sm leading-relaxed text-pretty">
        <TimedText text={text} />
      </p>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
