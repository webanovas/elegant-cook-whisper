import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  addChefConsultation,
  deleteRecipeLocal,
  removeChefConsultation,
  setIngredientNote,
  setIngredientOverride,
  setPersonalNote,
  setRecipeRating,
  setStepNote,
  setStepOverride,
  useRecipe,
  type Recipe,
} from "@/lib/recipes-store";
import { createRecipeCoverDataUrl, getRecipeImage, IDB_MARKER, useRecipeImage } from "@/lib/recipe-images";
import { refreshRecipeHeroImage } from "@/lib/recipe-hero";
import { PortionScaler } from "@/components/PortionScaler";
import { IngredientRow } from "@/components/IngredientRow";
import { StarRating } from "@/components/StarRating";
import { useT, useLang } from "@/lib/i18n";
import { TimedText } from "@/components/TimedText";
import { addGroceryItems } from "@/lib/grocery-store";
import { scaleAmount } from "@/lib/scale";
import { consultChefOnRecipe } from "@/lib/recipe-consult.functions";
import type { Ingredient } from "@/lib/recipes.functions";

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
  const lang = useLang();
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [addedAll, setAddedAll] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState<
    { confidence: number; warnings: string[] } | null
  >(null);
  const imgSrc = useRecipeImage(recipe?.id ?? "", recipe?.image_url ?? null);
  const fallbackHeroSrc = useMemo(
    () => (recipe ? createRecipeCoverDataUrl(recipe) : null),
    [recipe],
  );

  useEffect(() => {
    if (!recipe) return;
    try {
      const raw = window.sessionStorage.getItem(`gn:scan-notice:${recipe.id}`);
      if (raw) setScanNotice(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [recipe]);

  useEffect(() => {
    if (!recipe) return;
    const currentRecipe = recipe;
    let cancelled = false;

    async function maybeRefreshCookbookCover() {
      let shouldRefresh = !currentRecipe.image_url;
      if (currentRecipe.image_url?.startsWith("data:image/svg")) {
        shouldRefresh = true;
      } else if (currentRecipe.image_url?.startsWith(IDB_MARKER)) {
        const blob = await getRecipeImage(currentRecipe.id);
        if (cancelled) return;
        shouldRefresh = !blob || blob.type.includes("svg");
      }

      if (!shouldRefresh) return;
      refreshRecipeHeroImage(currentRecipe).catch((e) =>
        console.error("recipe hero repair failed", e),
      );
    }

    maybeRefreshCookbookCover();
    return () => {
      cancelled = true;
    };
  }, [recipe]);

  // Build a map of chef hints keyed by "target:sectionIndex:itemIndex" for fast lookup.
  const hintMap = useMemo(() => {
    const m = new Map<string, { text: string; consultId: string }[]>();
    (recipe?.chef_consultations ?? []).forEach((c) => {
      c.hints.forEach((h) => {
        const k = `${h.target}:${h.key}`;
        const arr = m.get(k) ?? [];
        arr.push({ text: h.text, consultId: c.id });
        m.set(k, arr);
      });
    });
    return m;
  }, [recipe?.chef_consultations]);

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
            {imgSrc || fallbackHeroSrc ? (
              <img
                src={imgSrc ?? fallbackHeroSrc ?? ""}
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
          <ShareButton recipe={recipe} />
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
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="small-caps text-[10px] text-ink-soft">{t("your_rating")}</span>
            <StarRating
              value={recipe.rating ?? 0}
              onChange={(v) => setRecipeRating(recipe.id, v)}
              size="md"
            />
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                className={`small-caps text-[10px] rounded-full px-3 py-1 border transition-colors ${
                  editMode
                    ? "bg-foreground text-background border-foreground"
                    : "border-ink-soft/40 text-ink-soft hover:border-terracotta hover:text-terracotta"
                }`}
              >
                {editMode ? `✓ ${t("done_editing")}` : `✎ ${t("edit_recipe")}`}
              </button>
            </div>
          </div>

          {/* Chef consult button */}
          <button
            type="button"
            onClick={() => setConsultOpen(true)}
            className="w-full mb-6 rounded-lg border border-terracotta/40 bg-terracotta/5 px-4 py-3 text-start hover:bg-terracotta/10 transition-colors"
          >
            <p className="small-caps text-[10px] text-terracotta font-semibold">✦ {t("chef_note")}</p>
            <p className="text-sm font-serif italic text-ink mt-0.5">
              {t("consult_chef")}
            </p>
          </button>

          {/* Chef consultations */}
          {(recipe.chef_consultations ?? []).map((c) => (
            <div
              key={c.id}
              className="mb-4 rounded border border-terracotta/40 bg-paper/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="small-caps text-[10px] text-terracotta font-semibold">
                    ✦ {t("chef_note")} · <span className="italic normal-case tracking-normal text-ink-soft">{c.request}</span>
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
                    {c.summary}
                  </p>
                  {c.hints.length === 0 && (
                    <p className="mt-1 text-[11px] italic text-ink-soft">{t("no_hints")}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeChefConsultation(recipe.id, c.id)}
                  aria-label={t("dismiss_consult")}
                  className="text-ink-soft/60 hover:text-terracotta text-lg leading-none px-1 shrink-0"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

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

          {/* Personal note */}
          <PersonalNoteBlock recipe={recipe} editMode={editMode} />

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
                        <IngredientLine
                          key={i}
                          recipe={recipe}
                          ingredient={ing}
                          sectionIndex={si}
                          itemIndex={i}
                          currentServings={servings}
                          editMode={editMode}
                          hints={hintMap.get(`ingredient:${si}:${i}`) ?? []}
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
                  <IngredientLine
                    key={i}
                    recipe={recipe}
                    ingredient={ing}
                    sectionIndex={-1}
                    itemIndex={i}
                    currentServings={servings}
                    editMode={editMode}
                    hints={hintMap.get(`ingredient:-1:${i}`) ?? []}
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
                        <StepBlock
                          key={i}
                          recipe={recipe}
                          n={i + 1}
                          text={step}
                          sectionIndex={si}
                          itemIndex={i}
                          editMode={editMode}
                          hints={hintMap.get(`step:${si}:${i}`) ?? []}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {recipe.instructions.map((step, i) => (
                  <StepBlock
                    key={i}
                    recipe={recipe}
                    n={i + 1}
                    text={step}
                    sectionIndex={-1}
                    itemIndex={i}
                    editMode={editMode}
                    hints={hintMap.get(`step:-1:${i}`) ?? []}
                  />
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

        <AnimatePresence>
          {consultOpen && (
            <ConsultModal
              recipe={recipe}
              lang={lang}
              onClose={() => setConsultOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* --- Personal note --- */
function PersonalNoteBlock({ recipe, editMode }: { recipe: Recipe; editMode: boolean }) {
  const t = useT();
  const [value, setValue] = useState(recipe.personal_note ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setValue(recipe.personal_note ?? "");
  }, [recipe.personal_note]);

  const hasNote = !!(recipe.personal_note && recipe.personal_note.trim());

  if (!editMode && !hasNote) return null;

  return (
    <div className="mt-6 rounded border border-dashed border-terracotta/40 bg-paper/30 p-3">
      <p className="small-caps text-[10px] text-terracotta font-semibold mb-1">
        {t("personal_note_label")}
      </p>
      {editMode ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setPersonalNote(recipe.id, value)}
            placeholder={t("personal_note_ph")}
            rows={3}
            className="w-full bg-transparent text-[13px] leading-relaxed text-ink italic outline-none resize-none placeholder:text-ink-soft/50"
          />
          {open && null}
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-ink italic whitespace-pre-wrap">
          {recipe.personal_note}
        </p>
      )}
    </div>
  );
}

/* --- Ingredient line: wraps IngredientRow with notes/overrides/hints --- */
function IngredientLine({
  recipe,
  ingredient,
  sectionIndex,
  itemIndex,
  currentServings,
  editMode,
  hints,
}: {
  recipe: Recipe;
  ingredient: Ingredient;
  sectionIndex: number;
  itemIndex: number;
  currentServings: number;
  editMode: boolean;
  hints: { text: string; consultId: string }[];
}) {
  const t = useT();
  const key = `${sectionIndex}:${itemIndex}`;
  const override = recipe.ingredient_overrides?.[key];
  const note = recipe.ingredient_notes?.[key];
  const [overrideDraft, setOverrideDraft] = useState(override ?? "");
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    setOverrideDraft(override ?? "");
  }, [override]);
  useEffect(() => {
    setNoteDraft(note ?? "");
  }, [note]);

  const effectiveIngredient: Ingredient = override
    ? { amount: "", unit: "", name: override }
    : ingredient;

  return (
    <>
      <IngredientRow
        ingredient={effectiveIngredient}
        originalServings={recipe.servings || 2}
        currentServings={currentServings}
        recipeTitle={recipe.title}
      />
      {override && !editMode && (
        <li className="list-none -mt-3 ps-1">
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="text-[10px] uppercase tracking-widest text-ink-soft/70 hover:text-terracotta"
          >
            {showOriginal ? t("hide_original") : `· ${t("edited_mark")} · ${t("show_original")}`}
          </button>
          {showOriginal && (
            <p className="text-[12px] italic text-ink-soft mt-1">
              {t("original_short")}:{" "}
              <span dir="ltr">
                {ingredient.amount} {ingredient.unit} {ingredient.name}
              </span>
            </p>
          )}
        </li>
      )}
      {note && !editMode && (
        <li className="list-none -mt-3 ps-1">
          <p className="text-[12px] italic text-ink-soft">
            <span className="small-caps text-[9px] text-terracotta me-1">{t("your_note")}:</span>
            {note}
          </p>
        </li>
      )}
      {hints.map((h, i) => (
        <li key={i} className="list-none -mt-3 ps-1">
          <p className="text-[12px] italic text-terracotta">
            <span className="small-caps text-[9px] font-semibold me-1">✦ {t("chef_note")}:</span>
            {h.text}
          </p>
        </li>
      ))}
      {editMode && (
        <li className="list-none -mt-2 ps-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={overrideDraft}
              onChange={(e) => setOverrideDraft(e.target.value)}
              onBlur={() => setIngredientOverride(recipe.id, key, overrideDraft)}
              placeholder={t("edit_ing_ph")}
              className="flex-1 bg-transparent border-b border-dashed border-ink-soft/30 focus:border-terracotta text-[13px] outline-none py-1"
            />
            {override && (
              <button
                type="button"
                onClick={() => {
                  setOverrideDraft("");
                  setIngredientOverride(recipe.id, key, "");
                }}
                className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-terracotta"
              >
                ↺ {t("revert")}
              </button>
            )}
          </div>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => setIngredientNote(recipe.id, key, noteDraft)}
            placeholder={t("ing_note_ph")}
            className="w-full bg-transparent border-b border-dashed border-ink-soft/30 focus:border-terracotta text-[13px] italic outline-none py-1 placeholder:text-ink-soft/40"
          />
        </li>
      )}
    </>
  );
}

/* --- Step block --- */
function StepBlock({
  recipe,
  n,
  text,
  sectionIndex,
  itemIndex,
  editMode,
  hints,
}: {
  recipe: Recipe;
  n: number;
  text: string;
  sectionIndex: number;
  itemIndex: number;
  editMode: boolean;
  hints: { text: string; consultId: string }[];
}) {
  const t = useT();
  const key = `${sectionIndex}:${itemIndex}`;
  const override = recipe.step_overrides?.[key];
  const note = recipe.step_notes?.[key];
  const [overrideDraft, setOverrideDraft] = useState(override ?? "");
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => setOverrideDraft(override ?? ""), [override]);
  useEffect(() => setNoteDraft(note ?? ""), [note]);

  const displayText = override ?? text;

  return (
    <div className="flex gap-4">
      <span
        dir="ltr"
        className="font-serif text-primary/40 text-2xl leading-none italic tabular-nums shrink-0"
      >
        {String(n).padStart(2, "0")}
      </span>
      <div className="flex-1 space-y-2">
        <p className="text-sm leading-relaxed text-pretty">
          <TimedText text={displayText} />
        </p>
        {override && !editMode && (
          <div>
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="text-[10px] uppercase tracking-widest text-ink-soft/70 hover:text-terracotta"
            >
              {showOriginal ? t("hide_original") : `· ${t("edited_mark")} · ${t("show_original")}`}
            </button>
            {showOriginal && (
              <p className="text-[12px] italic text-ink-soft mt-1">
                {t("original_short")}: {text}
              </p>
            )}
          </div>
        )}
        {note && !editMode && (
          <p className="text-[12px] italic text-ink-soft">
            <span className="small-caps text-[9px] text-terracotta me-1">{t("your_note")}:</span>
            {note}
          </p>
        )}
        {hints.map((h, i) => (
          <p key={i} className="text-[12px] italic text-terracotta">
            <span className="small-caps text-[9px] font-semibold me-1">✦ {t("chef_note")}:</span>
            {h.text}
          </p>
        ))}
        {editMode && (
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2">
              <textarea
                value={overrideDraft}
                onChange={(e) => setOverrideDraft(e.target.value)}
                onBlur={() => setStepOverride(recipe.id, key, overrideDraft)}
                placeholder={t("edit_step_ph")}
                rows={2}
                className="flex-1 bg-transparent border border-dashed border-ink-soft/30 focus:border-terracotta rounded px-2 py-1 text-[13px] outline-none resize-none placeholder:text-ink-soft/40"
              />
              {override && (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideDraft("");
                    setStepOverride(recipe.id, key, "");
                  }}
                  className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-terracotta shrink-0 mt-1"
                >
                  ↺ {t("revert")}
                </button>
              )}
            </div>
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => setStepNote(recipe.id, key, noteDraft)}
              placeholder={t("step_note_ph")}
              className="w-full bg-transparent border-b border-dashed border-ink-soft/30 focus:border-terracotta text-[13px] italic outline-none py-1 placeholder:text-ink-soft/40"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Consult modal --- */
function ConsultModal({
  recipe,
  lang,
  onClose,
}: {
  recipe: Recipe;
  lang: "en" | "he";
  onClose: () => void;
}) {
  const t = useT();
  const consult = useServerFn(consultChefOnRecipe);
  const [request, setRequest] = useState("");
  const [mode, setMode] = useState<"discuss" | "alter">("discuss");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  async function submit() {
    const q = request.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await consult({
        data: {
          request: q,
          lang,
          recipe: {
            title: recipe.title,
            description: recipe.description ?? null,
            servings: recipe.servings,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            ingredient_sections: recipe.ingredient_sections,
            instruction_sections: recipe.instruction_sections,
          },
        },
      });
      if (mode === "alter") {
        addChefConsultation(recipe.id, {
          request: q,
          summary: res.summary,
          hints: res.hints,
        });
        onClose();
      } else {
        // Discuss-only: show the summary in the dialog, don't pin anything.
        setReply(res.summary || t("no_hints"));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-background rounded-2xl border border-border shadow-2xl p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="small-caps text-[10px] text-terracotta font-semibold">
              ✦ {t("chef_note")}
            </p>
            <h4 className="font-serif text-xl mt-0.5">{t("consult_title")}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="text-ink-soft/60 hover:text-terracotta text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Mode toggle: discuss vs alter */}
        <div
          className="mb-3 inline-flex w-full rounded-full border border-border p-0.5 bg-paper/40"
          dir={lang === "he" ? "rtl" : "ltr"}
        >
          {(["discuss", "alter"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 text-[11px] small-caps py-1.5 rounded-full transition-colors ${
                mode === m
                  ? "bg-terracotta text-paper"
                  : "text-ink-soft hover:text-terracotta"
              }`}
            >
              {m === "discuss"
                ? t("consult_mode_discuss")
                : t("consult_mode_alter")}
            </button>
          ))}
        </div>
        <p className="text-[11px] italic text-ink-soft mb-3">
          {mode === "discuss"
            ? t("consult_mode_hint_discuss")
            : t("consult_mode_hint_alter")}
        </p>

        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={t("consult_ph")}
          rows={3}
          autoFocus
          className="w-full bg-paper/40 border border-border rounded-lg p-3 text-[14px] outline-none focus:border-terracotta resize-none placeholder:text-ink-soft/50"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        {reply && (
          <div className="mt-3 rounded-lg border border-terracotta/40 bg-terracotta/5 p-3">
            <p className="small-caps text-[10px] text-terracotta font-semibold mb-1">
              ✦ {t("consult_reply_title")}
            </p>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
              {reply}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] uppercase tracking-widest text-ink-soft px-3 py-2"
          >
            {reply ? t("consult_close") : t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !request.trim()}
            className="bg-terracotta text-paper text-[12px] uppercase tracking-widest px-4 py-2 rounded-full disabled:opacity-50"
          >
            {loading
              ? t("consult_thinking")
              : reply
                ? t("consult_ask_again")
                : t("consult_go")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareButton({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const { buildShareUrl } = await import("@/lib/share");
    const url = await buildShareUrl(recipe);
    const shareData = {
      title: recipe.title,
      text: recipe.description ?? recipe.title,
      url,
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt(t("share_sheet_title"), url);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t("share_recipe")}
      title={t("share_recipe")}
      className="absolute top-4 end-4 bg-background/80 backdrop-blur-md h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] shadow-sm small-caps text-ink hover:text-terracotta transition-colors"
    >
      <span aria-hidden className="text-sm leading-none">↗</span>
      <span>{copied ? t("share_copied") : t("share_recipe")}</span>
    </button>
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
