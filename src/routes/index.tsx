import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useRecipes, saveRecipe, type Recipe } from "@/lib/recipes-store";
import { StarRating } from "@/components/StarRating";
import { createRecipeCoverDataUrl } from "@/lib/recipe-images";
import { refreshRecipeHeroImage } from "@/lib/recipe-hero";
import { RecipeCard } from "@/components/RecipeCard";
import { LangToggle } from "@/components/LangToggle";
import { AchievementsStrip } from "@/components/Achievements";
import { useT, useLang } from "@/lib/i18n";
import {
  extractRecipe,
  searchRecipesOnWeb,
  type WebRecipeResult,
} from "@/lib/recipes.functions";
import { filterRecipesByVibe } from "@/lib/classify.functions";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gourmet Notes — Your private recipe library" },
      {
        name: "description",
        content:
          "A private, growing library of the recipes you love. Filter by dish, prep time, rating, or ask the cook for a vibe.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const recipes = useRecipes();
  const t = useT();

  return (
    <div className="min-h-screen py-4 sm:py-6 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/grocery"
            className="small-caps text-[10px] text-ink-soft hover:text-terracotta inline-flex items-center gap-1.5"
          >
            <span>🛒</span>
            <span>{t("grocery_link")}</span>
          </Link>
          <Link
            to="/chat"
            className="small-caps text-[10px] text-terracotta hover:underline ms-auto"
          >
            {t("ask_the_cook")}
          </Link>
          <LangToggle />
        </div>

        <ProudHeader count={recipes.length} />

        <div className="mt-3 space-y-2">
          <ImportCard />
          <AchievementsStrip recipes={recipes} />
        </div>

        <FilterableGallery recipes={recipes} />

        <p className="mt-10 text-center small-caps text-[10px] text-ink-soft/70">
          {t("kept_privately")}
        </p>
      </div>
    </div>
  );
}

/* ------------------------- proud header w/ counter ------------------------ */

function ProudHeader({ count }: { count: number }) {
  const t = useT();
  const tier =
    count === 0
      ? "empty"
      : count < 5
        ? "seedling"
        : count < 15
          ? "growing"
          : count < 40
            ? "flourishing"
            : count < 100
              ? "abundant"
              : "legendary";

  const tierKey: Record<typeof tier, string> = {
    empty: "tier_empty",
    seedling: "tier_seedling",
    growing: "tier_growing",
    flourishing: "tier_flourishing",
    abundant: "tier_abundant",
    legendary: "tier_legendary",
  };

  return (
    <header className="mt-2 flex items-center gap-3 border-b border-rule/50 pb-3">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        dir="ltr"
        className="font-serif italic text-[2.6rem] sm:text-[3rem] leading-none tabular-nums text-terracotta shrink-0"
      >
        {count}
      </motion.span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="font-serif italic text-[1.4rem] sm:text-[1.7rem] leading-none tracking-tight">
            {t("your_library")}
          </h1>
          <span className="small-caps text-[10px] text-ink-soft">
            {count === 1 ? t("recipe_word") : t("recipes_word")}
          </span>
        </div>
        <p className="mt-1 font-serif italic text-[12px] text-ink-soft leading-snug">
          {t(tierKey[tier])}
        </p>
      </div>
      <span className="text-gold text-base ms-auto shrink-0" aria-hidden="true">
        ❦
      </span>
    </header>
  );
}

/* --------------------------------- import --------------------------------- */

function ImportCard() {
  const router = useRouter();
  const t = useT();
  const extract = useServerFn(extractRecipe);
  const search = useServerFn(searchRecipesOnWeb);
  const [mode, setMode] = useState<"url" | "search">("url");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WebRecipeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function importFromUrl(sourceUrl: string) {
    setLoading(true);
    setError(null);
    setImportingUrl(sourceUrl);
    try {
      const extracted = await extract({ data: { url: sourceUrl } });
      // Save with an instant local cover so navigation never shows a blank slot,
      // then regenerate a fresh hero image in the background.
      const saved = saveRecipe({
        ...extracted,
        cookbook_id: "general",
        image_url: createRecipeCoverDataUrl(extracted),
      });
      setUrl("");
      router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
      refreshRecipeHeroImage(saved).catch((e) => console.error("hero image gen failed", e));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setImportingUrl(null);
    }
  }

  async function onSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    await importFromUrl(url.trim());
  }

  async function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const rows = await search({ data: { query: query.trim() } });
      setResults(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="mb-8 paper-page rounded-[3px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="small-caps text-[11px] text-terracotta">
          {t("add_new_recipe")}
        </span>
        <span
          className={`text-terracotta text-xs transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-rule/40 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-center gap-2">
            <ModeTab active={mode === "url"} onClick={() => setMode("url")}>
              {t("from_url")}
            </ModeTab>
            <span className="text-ink-soft/40 text-[10px]">·</span>
            <ModeTab active={mode === "search"} onClick={() => setMode("search")}>
              {t("search_web")}
            </ModeTab>
          </div>

          {mode === "url" ? (
            <form onSubmit={onSubmitUrl} className="mt-3 flex gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("paste_url_ph")}
                className="flex-1 bg-card/60 border border-border/70 rounded px-3 py-2 text-sm font-serif italic outline-none focus:border-terracotta/60 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-ink text-paper px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
              >
                {loading ? t("reading") : t("clip")}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={onSubmitSearch} className="mt-3 flex gap-2">
                <input
                  type="text"
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search_ph_web")}
                  className="flex-1 bg-card/60 border border-border/70 rounded px-3 py-2 text-sm font-serif italic outline-none focus:border-terracotta/60 transition-colors"
                  disabled={searching || loading}
                />
                <button
                  type="submit"
                  disabled={searching || loading}
                  className="bg-ink text-paper px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
                >
                  {searching ? t("searching") : t("search")}
                </button>
              </form>

              {results && results.length > 0 && (
                <ul className="mt-4 divide-y divide-rule/40 border-y border-rule/40">
                  {[...results]
                    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
                    .map((r) => {
                      const isImporting = importingUrl === r.url;
                      return (
                        <li key={r.url}>
                          <button
                            type="button"
                            onClick={() => importFromUrl(r.url)}
                            disabled={loading}
                            className="w-full text-left py-3 px-1 flex items-start gap-3 hover:bg-terracotta/5 disabled:opacity-50 transition-colors rounded"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-serif italic text-[14px] leading-snug text-balance">
                                {r.title}
                              </p>
                              {(r.rating !== null || r.reviews !== null) && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  {r.rating !== null && (
                                    <>
                                      <StarRating
                                        value={Math.round(r.rating)}
                                        readOnly
                                        size="sm"
                                      />
                                      <span className="small-caps text-[10px] text-ink">
                                        {r.rating.toFixed(1)}
                                      </span>
                                    </>
                                  )}
                                  {r.reviews !== null && (
                                    <span className="text-[10px] text-ink-soft">
                                      ({r.reviews.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              )}
                              {r.description && (
                                <p className="mt-1 text-[11px] text-ink-soft line-clamp-2">
                                  {r.description}
                                </p>
                              )}
                              {r.source && (
                                <p className="mt-1 small-caps text-[9px] text-terracotta/80">
                                  {r.source}
                                </p>
                              )}
                            </div>
                            <span className="small-caps text-[10px] text-terracotta shrink-0 mt-1">
                              {isImporting ? t("clipping") : t("clip_arrow")}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
              {results && results.length === 0 && (
                <p className="mt-3 text-xs text-ink-soft italic text-center">
                  {t("no_web_results")}
                </p>
              )}
            </>
          )}

          {error && (
            <p className="mt-2 text-xs text-destructive italic text-center">
              {error}
            </p>
          )}
          {loading && (
            <p className="mt-2 text-xs text-ink-soft italic text-center">
              {t("transcribing")}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-rule/40 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              to="/recipes/scan"
              className="small-caps text-[10px] text-terracotta hover:underline inline-flex items-center gap-1.5"
            >
              <span>📷</span>
              <span>{t("scan_a_recipe")}</span>
            </Link>
            <span className="text-ink-soft/30 text-[10px]">·</span>
            <Link
              to="/recipes/new"
              className="small-caps text-[10px] text-terracotta hover:underline inline-flex items-center gap-1.5"
            >
              <span>✎</span>
              <span>{t("write_manually")}</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`small-caps text-[10px] px-2 py-1 rounded transition-colors ${
        active
          ? "text-terracotta border-b border-terracotta"
          : "text-ink-soft hover:text-terracotta"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------- gallery --------------------------------- */

function parsePrepMinutes(s: string | null): number | null {
  if (!s) return null;
  const lower = s.toLowerCase();
  let total = 0;
  const h = lower.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours|שעה|שעות)/);
  if (h) total += parseFloat(h[1]) * 60;
  const m = lower.match(/(\d+)\s*(m|min|mins|minute|minutes|דק|דקות)/);
  if (m) total += parseInt(m[1], 10);
  if (total === 0) {
    const n = lower.match(/(\d+)/);
    if (n) total = parseInt(n[1], 10);
  }
  return total > 0 ? total : null;
}

/** Slider stop → max prep minutes (0 = no filter). */
const QUICKNESS_STOPS = [0, 15, 30, 45, 60, 90] as const;

function quicknessLabel(stop: number, t: (k: string) => string): string {
  if (stop === 0) return t("quickness_any");
  if (stop === 15) return t("quickness_15");
  if (stop === 30) return t("quickness_30");
  if (stop === 45) return t("quickness_45");
  if (stop === 60) return t("quickness_60");
  return t("quickness_90");
}

/** Stable-ish random shuffle seeded by a session key. */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function FilterableGallery({ recipes }: { recipes: Recipe[] }) {
  const t = useT();
  const lang = useLang();
  const askVibe = useServerFn(filterRecipesByVibe);

  // 0 = any, else index into QUICKNESS_STOPS
  const [quickIdx, setQuickIdx] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [vibe, setVibe] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState<string | null>(null);
  const [vibeIds, setVibeIds] = useState<string[] | null>(null);
  const [vibeNote, setVibeNote] = useState<string | null>(null);
  // when filters are active and user asks the cook, we hold their vibe
  // string here and ask whether to respect the filters before running.
  const [pendingVibe, setPendingVibe] = useState<string | null>(null);

  const maxPrep = QUICKNESS_STOPS[quickIdx];
  const anyFilterActive = quickIdx > 0 || minRating > 0;

  useEffect(() => {
    if (vibeIds && vibeIds.some((id) => !recipes.find((r) => r.id === id))) {
      setVibeIds(null);
      setVibeNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

  const passesFilters = (r: Recipe): boolean => {
    if (minRating > 0 && (r.rating ?? 0) < minRating) return false;
    if (maxPrep > 0) {
      const n = parsePrepMinutes(r.prep_time);
      if (n === null || n > maxPrep) return false;
    }
    const q = searchQ.trim().toLowerCase();
    if (q) {
      const hay = [
        r.title,
        r.description ?? "",
        (r.tags ?? []).join(" "),
        (r.ingredients ?? []).map((i) => i.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const base = recipes.filter(passesFilters);

    if (vibeIds && vibeIds.length > 0) {
      const map = new Map(base.map((r) => [r.id, r]));
      const inFilters = vibeIds.map((id) => map.get(id)).filter(Boolean) as Recipe[];
      // If the vibe was resolved against the full library (ignore filters),
      // we still surface those picks even when outside current filters.
      if (inFilters.length > 0) return inFilters;
      const full = new Map(recipes.map((r) => [r.id, r]));
      return vibeIds.map((id) => full.get(id)).filter(Boolean) as Recipe[];
    }

    // Default: quick-first when a quickness cap is set, else random surprise.
    if (quickIdx > 0) {
      return [...base].sort((a, b) => {
        const am = parsePrepMinutes(a.prep_time) ?? Number.POSITIVE_INFINITY;
        const bm = parsePrepMinutes(b.prep_time) ?? Number.POSITIVE_INFINITY;
        return am - bm;
      });
    }
    if (minRating > 0) {
      return [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return shuffleWithSeed(base, shuffleSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, quickIdx, minRating, shuffleSeed, vibeIds, searchQ]);

  async function runVibe(vibeText: string, respectFilters: boolean) {
    setVibeLoading(true);
    setVibeError(null);
    setPendingVibe(null);
    try {
      const pool = respectFilters ? recipes.filter(passesFilters) : recipes;
      const compact = pool.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        tags: r.tags,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        rating: r.rating ?? null,
      }));
      const res = await askVibe({
        data: { vibe: vibeText, recipes: compact, lang },
      });
      if (res.ids.length === 0) {
        setVibeError(t("vibe_no_match"));
        setVibeIds(null);
        setVibeNote(null);
      } else {
        setVibeIds(res.ids);
        setVibeNote(res.note);
      }
    } catch (err) {
      setVibeError((err as Error).message);
    } finally {
      setVibeLoading(false);
    }
  }

  function onSubmitVibe(e: React.FormEvent) {
    e.preventDefault();
    const text = vibe.trim();
    if (!text || vibeLoading) return;
    if (anyFilterActive) {
      setPendingVibe(text);
      return;
    }
    void runVibe(text, false);
  }

  function clearVibe() {
    setVibeIds(null);
    setVibeNote(null);
    setVibe("");
    setVibeError(null);
  }

  function reset() {
    setQuickIdx(0);
    setMinRating(0);
    setSearchQ("");
    setShuffleSeed(Math.floor(Math.random() * 1e6));
    clearVibe();
  }

  const hasRecipes = recipes.length > 0;

  return (
    <section>
      {hasRecipes && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px] items-start">
          {/* Toolbar + collapsible filters/search */}
          <LayoutGroup>
            <motion.div layout="position" className="space-y-3">
              <motion.div layout="position" className="flex items-center gap-2 flex-wrap">
                <motion.button
                  layout
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-expanded={searchOpen}
                  aria-label={t("search_label")}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`inline-flex items-center gap-1.5 small-caps text-[10px] rounded-full border px-3 py-1.5 transition-colors ${
                    searchOpen || searchQ
                      ? "bg-terracotta text-paper border-terracotta"
                      : "text-terracotta border-terracotta/40 hover:bg-terracotta hover:text-paper"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <span>{t("search_label")}</span>
                </motion.button>
                <motion.button
                  layout
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`inline-flex items-center gap-1.5 small-caps text-[10px] rounded-full border px-3 py-1.5 transition-colors ${
                    filtersOpen || anyFilterActive
                      ? "bg-terracotta text-paper border-terracotta"
                      : "text-terracotta border-terracotta/40 hover:bg-terracotta hover:text-paper"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  <span>{t("filters_label")}</span>
                  <AnimatePresence>
                    {anyFilterActive && (
                      <motion.span
                        key="dot"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="inline-block w-1.5 h-1.5 rounded-full bg-paper"
                      />
                    )}
                  </AnimatePresence>
                </motion.button>

                <motion.span layout className="small-caps text-[10px] text-ink-soft ms-auto">
                  <motion.span
                    key={`${filtered.length}-${recipes.length}`}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    dir="ltr"
                    className="inline-block"
                  >
                    {filtered.length} {t("of_total")} {recipes.length}
                  </motion.span>
                  <AnimatePresence mode="wait" initial={false}>
                    {!anyFilterActive && !vibeIds && !searchQ ? (
                      <motion.button
                        key="reshuffle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        type="button"
                        onClick={() => setShuffleSeed(Math.floor(Math.random() * 1e6))}
                        className="ms-3 text-terracotta hover:underline"
                      >
                        {t("reshuffle")}
                      </motion.button>
                    ) : (
                      <motion.button
                        key="reset"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        type="button"
                        onClick={reset}
                        className="ms-3 text-ink-soft/70 hover:text-terracotta"
                      >
                        {t("reset_all")}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.span>
              </motion.div>

              <AnimatePresence initial={false}>
                {searchOpen && (
                  <motion.div
                    key="search-panel"
                    layout
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.22 } }}
                    className="overflow-hidden"
                  >
                    <div className="paper-page rounded-[3px] px-4 py-3 sm:px-5 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-soft shrink-0">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                      <input
                        type="text"
                        autoFocus
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder={t("search_ph")}
                        className="flex-1 min-w-0 bg-transparent py-1 text-sm font-serif italic outline-none placeholder:text-ink-soft/60"
                      />
                      <AnimatePresence>
                        {searchQ && (
                          <motion.button
                            key="clear-q"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            type="button"
                            onClick={() => setSearchQ("")}
                            className="small-caps text-[10px] text-ink-soft/70 hover:text-terracotta"
                          >
                            {t("clear")}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {filtersOpen && (
                  <motion.div
                    key="filters-panel"
                    layout
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ height: { duration: 0.36, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.24 } }}
                    className="overflow-hidden"
                  >
                    <div className="paper-page rounded-[3px] px-4 py-5 sm:px-5 space-y-6">
                      <QuicknessTabs value={quickIdx} onChange={setQuickIdx} t={t} />
                      <RatingStars value={minRating} onChange={setMinRating} t={t} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          {/* Ask the cook */}
          <div className="paper-page rounded-[3px] px-4 py-4 sm:px-5">
            <p className="small-caps text-[10px] text-terracotta">
              {t("ask_narrow")}
            </p>
            <form onSubmit={onSubmitVibe} className="mt-2 flex gap-2">
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder={t("ask_placeholder_vibe")}
                className="flex-1 min-w-0 bg-transparent border-b border-rule/60 py-2 text-sm font-serif italic outline-none focus:border-terracotta"
                disabled={vibeLoading}
              />
              <button
                type="submit"
                disabled={vibeLoading || !vibe.trim() || !!pendingVibe}
                className="small-caps text-[10px] text-terracotta border border-terracotta/40 rounded-full px-3 py-1 hover:bg-terracotta hover:text-paper transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-terracotta"
              >
                {vibeLoading ? t("thinking") : t("match_btn")}
              </button>
            </form>

            {pendingVibe && (
              <div className="mt-3 border-t border-rule/40 pt-3">
                <p className="text-[12px] font-serif italic text-ink">
                  {t("filters_active_q")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runVibe(pendingVibe, true)}
                    className="small-caps text-[10px] text-paper bg-terracotta rounded-full px-3 py-1 hover:opacity-90 transition-opacity"
                  >
                    {t("keep_filters")}
                  </button>
                  <button
                    type="button"
                    onClick={() => runVibe(pendingVibe, false)}
                    className="small-caps text-[10px] text-terracotta border border-terracotta/40 rounded-full px-3 py-1 hover:bg-terracotta hover:text-paper transition-colors"
                  >
                    {t("ignore_filters")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingVibe(null)}
                    className="small-caps text-[10px] text-ink-soft/70 hover:text-terracotta px-2 py-1"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}

            {vibeError && (
              <p className="mt-2 text-[11px] text-destructive italic">{vibeError}</p>
            )}
            {vibeNote && vibeIds && (
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="text-[12px] font-serif italic text-ink-soft">
                  “{vibeNote}”
                </p>
                <button
                  type="button"
                  onClick={clearVibe}
                  className="small-caps text-[9px] text-ink-soft/70 hover:text-terracotta shrink-0"
                >
                  {t("clear")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The library itself */}
      <div className="mt-8">
        {!hasRecipes ? (
          <div className="text-center py-16 border border-dashed border-rule/60 rounded-md bg-paper-deep/30">
            <p className="font-serif italic text-xl text-ink">
              {t("first_page_lib")}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{t("clip_hint_lib")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-14 text-sm text-ink-soft italic">
            {t("no_match_short")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-8">
            {filtered.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type Tr = (k: string) => string;

function QuicknessTabs({
  value,
  onChange,
  t,
}: {
  value: number;
  onChange: (v: number) => void;
  t: Tr;
}) {
  const stops = QUICKNESS_STOPS;
  const shortLabel = (i: number): string => {
    const m = stops[i];
    if (m === 0) return t("quick_any");
    if (m < 60) return `${m}${t("min_short")}`;
    if (m === 60) return `1${t("hr_short")}`;
    return `1½${t("hr_short")}`;
  };
  return (
    <div className="space-y-3">
      <div
        className="flex justify-between items-baseline border-b border-terracotta/20 pb-1"
      >
        <span className="font-serif italic text-[19px] text-ink">
          {t("quickness")}
        </span>
        <span className="small-caps text-[11px] tracking-widest text-terracotta font-semibold">
          {quicknessLabel(stops[value], t)}
        </span>
      </div>
      <div dir="ltr" className="flex items-center justify-between gap-1">
        {stops.map((_, i) => {
          const active = i === value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={
                "flex-1 py-2 border transition-colors small-caps text-[10px] tracking-widest " +
                (active
                  ? "bg-terracotta text-primary-foreground border-terracotta shadow-inner"
                  : "border-terracotta/30 text-terracotta/70 hover:bg-terracotta/5")
              }
            >
              {shortLabel(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RatingStars({
  value,
  onChange,
  t,
}: {
  value: number;
  onChange: (v: number) => void;
  t: Tr;
}) {
  const summary =
    value === 0
      ? t("rating_any")
      : `${value}★ ${t("and_up")}`;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline border-b border-terracotta/20 pb-1">
        <span className="font-serif italic text-[19px] text-ink">
          {t("rating_label")}
        </span>
        <span className="small-caps text-[11px] tracking-widest text-terracotta font-semibold">
          {summary}
        </span>
      </div>
      <div dir="ltr" className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n}`}
              onClick={() => onChange(value === n ? 0 : n)}
              className="p-1 transition-transform active:scale-90"
            >
              <svg
                viewBox="0 0 20 20"
                className={
                  "w-6 h-6 " +
                  (active ? "fill-gold" : "fill-ink/15 hover:fill-terracotta/30")
                }
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
        <div className="ms-2 flex-1 flex justify-between px-1 opacity-60">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={
                (i % 2 === 0 ? "h-2" : "h-1") + " w-px bg-terracotta/30"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

