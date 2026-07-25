import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRecipes, saveRecipe, type Recipe } from "@/lib/recipes-store";
import { StarRating } from "@/components/StarRating";
import { RecipeCard } from "@/components/RecipeCard";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/lib/i18n";
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
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <div className="max-w-[760px] mx-auto flex justify-end mb-2">
        <LangToggle />
      </div>

      <ProudHeader count={recipes.length} />

      <div className="mt-10 max-w-[760px] mx-auto">
        <ImportCard />

        <FilterableGallery recipes={recipes} />

        <div className="mt-14 text-center">
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 small-caps text-[11px] text-ink-soft hover:text-terracotta transition-colors"
          >
            {t("ask_the_cook")}
          </Link>
        </div>
      </div>

      <p className="mt-14 text-center small-caps text-[10px] text-ink-soft/70">
        {t("kept_privately")}
      </p>
    </div>
  );
}

/* ------------------------- proud header w/ counter ------------------------ */

function ProudHeader({ count }: { count: number }) {
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

  const tierLine: Record<typeof tier, string> = {
    empty: "your library is waiting for its first page",
    seedling: "a young library, promising",
    growing: "a proper little collection",
    flourishing: "a flourishing kitchen library",
    abundant: "an abundant, well-loved cookbook",
    legendary: "a legendary personal library ✦",
  };

  return (
    <header className="text-center max-w-[560px] mx-auto">
      <p className="small-caps text-[11px] text-terracotta">Gourmet Notes</p>
      <h1 className="mt-2 font-serif text-[3rem] sm:text-[3.4rem] leading-[0.95] tracking-tight">
        <span className="italic">Your</span>
        <br />
        Library
      </h1>
      <div className="mx-auto mt-5 flex items-center gap-3 max-w-[240px]">
        <span className="flex-1 h-px bg-rule/60" />
        <span className="text-gold text-lg">❦</span>
        <span className="flex-1 h-px bg-rule/60" />
      </div>

      <motion.div
        key={count}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 flex flex-col items-center"
      >
        <div className="flex items-baseline gap-3">
          <span
            dir="ltr"
            className="font-serif italic text-[5rem] sm:text-[6rem] leading-none tabular-nums text-terracotta drop-shadow-[0_2px_0_rgba(168,93,68,0.15)]"
          >
            {count}
          </span>
          <span className="small-caps text-[11px] text-ink-soft">
            {count === 1 ? "recipe" : "recipes"}
          </span>
        </div>
        <p className="mt-3 font-serif italic text-[14px] text-ink-soft">
          {tierLine[tier]}
        </p>
      </motion.div>
    </header>
  );
}

/* --------------------------------- import --------------------------------- */

function ImportCard() {
  const router = useRouter();
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
      const saved = saveRecipe({ ...extracted, cookbook_id: "general" });
      setUrl("");
      router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
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
          + add a new recipe
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
              from a URL
            </ModeTab>
            <span className="text-ink-soft/40 text-[10px]">·</span>
            <ModeTab active={mode === "search"} onClick={() => setMode("search")}>
              search the web
            </ModeTab>
          </div>

          {mode === "url" ? (
            <form onSubmit={onSubmitUrl} className="mt-3 flex gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any recipe URL…"
                className="flex-1 bg-card/60 border border-border/70 rounded px-3 py-2 text-sm font-serif italic outline-none focus:border-terracotta/60 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-ink text-paper px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
              >
                {loading ? "Reading…" : "Clip"}
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
                  placeholder="e.g. Neapolitan pizza dough"
                  className="flex-1 bg-card/60 border border-border/70 rounded px-3 py-2 text-sm font-serif italic outline-none focus:border-terracotta/60 transition-colors"
                  disabled={searching || loading}
                />
                <button
                  type="submit"
                  disabled={searching || loading}
                  className="bg-ink text-paper px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
                >
                  {searching ? "Searching…" : "Search"}
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
                              {isImporting ? "clipping…" : "clip →"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
              {results && results.length === 0 && (
                <p className="mt-3 text-xs text-ink-soft italic text-center">
                  No recipes found. Try a different search.
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
              Transcribing to a fresh page & plating a picture…
            </p>
          )}
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

const PREP_BUCKETS = [
  { id: "all", label: "any length", test: (_: number | null) => true },
  { id: "quick", label: "under 15 min", test: (n: number | null) => n !== null && n < 15 },
  { id: "medium", label: "15 – 30 min", test: (n: number | null) => n !== null && n >= 15 && n <= 30 },
  { id: "long", label: "30 – 60 min", test: (n: number | null) => n !== null && n > 30 && n <= 60 },
  { id: "xlong", label: "over 1 hour", test: (n: number | null) => n !== null && n > 60 },
] as const;

type SortKey = "surprise" | "quick" | "top" | "newest" | "az";

/** Stable-ish random shuffle seeded by a session key so it doesn't reshuffle on every render. */
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
  const askVibe = useServerFn(filterRecipesByVibe);
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [dishType, setDishType] = useState<string>("all");
  const [prepBucket, setPrepBucket] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("surprise");
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [vibe, setVibe] = useState("");
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState<string | null>(null);
  const [vibeIds, setVibeIds] = useState<string[] | null>(null);
  const [vibeNote, setVibeNote] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => t && set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  // Reset a stale AI pick when the underlying library changes.
  useEffect(() => {
    if (vibeIds && vibeIds.some((id) => !recipes.find((r) => r.id === id))) {
      setVibeIds(null);
      setVibeNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bucket = PREP_BUCKETS.find((b) => b.id === prepBucket) ?? PREP_BUCKETS[0];
    const base = recipes.filter((r) => {
      if (minRating > 0 && (r.rating ?? 0) < minRating) return false;
      if (dishType !== "all" && !r.tags.some((t) => t.toLowerCase() === dishType.toLowerCase()))
        return false;
      if (prepBucket !== "all" && !bucket.test(parsePrepMinutes(r.prep_time))) return false;
      if (!q) return true;
      const hay = [r.title, r.description ?? "", r.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    // Gemini vibe overrides sort with its own ordered ids (intersected with filters).
    if (vibeIds && vibeIds.length > 0) {
      const map = new Map(base.map((r) => [r.id, r]));
      return vibeIds.map((id) => map.get(id)).filter(Boolean) as Recipe[];
    }

    const sorted = [...base];
    if (sortBy === "top") {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "quick") {
      sorted.sort((a, b) => {
        const am = parsePrepMinutes(a.prep_time) ?? Number.POSITIVE_INFINITY;
        const bm = parsePrepMinutes(b.prep_time) ?? Number.POSITIVE_INFINITY;
        return am - bm;
      });
    } else if (sortBy === "az") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    } else {
      // surprise (default) — random with a stable seed
      return shuffleWithSeed(sorted, shuffleSeed);
    }
    return sorted;
  }, [recipes, query, minRating, dishType, prepBucket, sortBy, shuffleSeed, vibeIds]);

  async function runVibe(e: React.FormEvent) {
    e.preventDefault();
    if (!vibe.trim() || vibeLoading) return;
    setVibeLoading(true);
    setVibeError(null);
    try {
      const compact = recipes.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        tags: r.tags,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        rating: r.rating ?? null,
      }));
      const res = await askVibe({ data: { vibe: vibe.trim(), recipes: compact } });
      if (res.ids.length === 0) {
        setVibeError("The cook couldn't match that mood — try different words.");
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

  function clearVibe() {
    setVibeIds(null);
    setVibeNote(null);
    setVibe("");
    setVibeError(null);
  }

  function reset() {
    setQuery("");
    setMinRating(0);
    setDishType("all");
    setPrepBucket("all");
    setSortBy("surprise");
    setShuffleSeed(Math.floor(Math.random() * 1e6));
    clearVibe();
  }

  const hasRecipes = recipes.length > 0;

  return (
    <section>
      {hasRecipes && (
        <>
          {/* Vibe / Gemini filter */}
          <div className="paper-page rounded-[3px] px-4 py-4 sm:px-5">
            <p className="small-caps text-[10px] text-terracotta">
              ✦ ask the cook to narrow it down
            </p>
            <form onSubmit={runVibe} className="mt-2 flex gap-2">
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="e.g. cozy rainy night · quick weeknight · impress my parents"
                className="flex-1 bg-transparent border-b border-rule/60 py-2 text-sm font-serif italic outline-none focus:border-terracotta"
                disabled={vibeLoading}
              />
              <button
                type="submit"
                disabled={vibeLoading || !vibe.trim()}
                className="small-caps text-[10px] text-terracotta border border-terracotta/40 rounded-full px-3 py-1 hover:bg-terracotta hover:text-paper transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-terracotta"
              >
                {vibeLoading ? "thinking…" : "match"}
              </button>
            </form>
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
                  clear
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4 paper-page rounded-[3px] overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={filtersOpen}
            >
              <span className="small-caps text-[11px] text-terracotta">
                ⌕ search & filter
                <span className="text-ink-soft/70">
                  {" "}· {filtered.length} of {recipes.length}
                </span>
              </span>
              <span
                className={`text-terracotta text-xs transition-transform duration-300 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {filtersOpen && (
              <div className="border-t border-rule/40 px-4 py-4 sm:px-5">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, tag, description…"
                  className="w-full bg-transparent border-b border-rule/60 py-2 font-serif italic text-base outline-none focus:border-terracotta"
                />

                <div className="mt-4 grid gap-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="small-caps text-[10px] text-ink-soft">dish type</span>
                    <select
                      value={dishType}
                      onChange={(e) => setDishType(e.target.value)}
                      className="bg-transparent border-b border-rule/60 text-sm py-1 font-serif italic outline-none focus:border-terracotta max-w-[60%]"
                    >
                      <option value="all">all types</option>
                      {allTags.map((tg) => (
                        <option key={tg} value={tg}>
                          {tg}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between gap-3">
                    <span className="small-caps text-[10px] text-ink-soft">prep length</span>
                    <select
                      value={prepBucket}
                      onChange={(e) => setPrepBucket(e.target.value)}
                      className="bg-transparent border-b border-rule/60 text-sm py-1 font-serif italic outline-none focus:border-terracotta max-w-[60%]"
                    >
                      {PREP_BUCKETS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-3">
                    <span className="small-caps text-[10px] text-ink-soft">min stars</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={minRating} onChange={setMinRating} size="sm" />
                      {minRating > 0 && (
                        <button
                          type="button"
                          onClick={() => setMinRating(0)}
                          className="small-caps text-[9px] text-ink-soft/70 hover:text-terracotta"
                        >
                          any
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3">
                    <span className="small-caps text-[10px] text-ink-soft">sort by</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as SortKey);
                        if (e.target.value === "surprise") {
                          setShuffleSeed(Math.floor(Math.random() * 1e6));
                        }
                      }}
                      className="bg-transparent border-b border-rule/60 text-sm py-1 font-serif italic outline-none focus:border-terracotta max-w-[60%]"
                    >
                      <option value="surprise">surprise me (default)</option>
                      <option value="quick">quickest first</option>
                      <option value="top">top rated</option>
                      <option value="newest">most recent</option>
                      <option value="az">a → z</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  {sortBy === "surprise" ? (
                    <button
                      type="button"
                      onClick={() => setShuffleSeed(Math.floor(Math.random() * 1e6))}
                      className="small-caps text-[10px] text-terracotta hover:underline"
                    >
                      ↻ reshuffle
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="small-caps text-[10px] text-ink-soft/70 hover:text-terracotta"
                  >
                    reset all
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* The library itself */}
      <div className="mt-10">
        {!hasRecipes ? (
          <div className="text-center py-16 border border-dashed border-rule/60 rounded-md bg-paper-deep/30">
            <p className="font-serif italic text-xl text-ink">
              The first page of your library.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Clip a recipe above to begin.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-14 text-sm text-ink-soft italic">
            no recipes match these filters
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
            {filtered.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
