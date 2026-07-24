import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useCookbooks,
  createCookbook,
  type Cookbook,
} from "@/lib/cookbooks-store";
import { useRecipes } from "@/lib/recipes-store";
import { StarRating } from "@/components/StarRating";
import { RecipeCard } from "@/components/RecipeCard";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gourmet Notes — Your cookbook shelf" },
      {
        name: "description",
        content:
          "A private shelf of vintage cookbooks. Open one, or start a new volume — cookies, pastas, whatever you're keeping.",
      },
    ],
  }),
  component: ShelfPage,
});

function ShelfPage() {
  const books = useCookbooks();
  const recipes = useRecipes();
  const [creating, setCreating] = useState(false);

  const countFor = (id: string) =>
    recipes.filter((r) => r.cookbook_id === id).length;

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <header className="text-center max-w-[520px] mx-auto">
        <p className="small-caps text-[11px] text-terracotta">from the library of</p>
        <h1 className="mt-2 font-serif text-[3rem] sm:text-[3.4rem] leading-[0.95] tracking-tight">
          <span className="italic">Gourmet</span>
          <br />
          Notes
        </h1>
        <div className="mx-auto mt-5 flex items-center gap-3 max-w-[240px]">
          <span className="flex-1 h-px bg-rule/60" />
          <span className="text-gold text-lg">❦</span>
          <span className="flex-1 h-px bg-rule/60" />
        </div>
        <p className="mt-5 font-serif italic text-[15px] text-ink-soft leading-relaxed">
          Choose a cookbook from the shelf, or bind a new one.
        </p>
      </header>

      <div className="mt-10 max-w-[720px] mx-auto">
        <SearchAllRecipes recipes={recipes} books={books} />

        <BookShelf books={books} countFor={countFor} />

        <div className="mt-10">
          {creating ? (
            <NewBookForm
              onClose={() => setCreating(false)}
              onCreated={() => setCreating(false)}
            />
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mx-auto block small-caps text-[11px] text-terracotta hover:text-ink transition-colors border border-terracotta/40 rounded-full px-5 py-2"
            >
              + bind a new volume
            </button>
          )}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 small-caps text-[11px] text-ink-soft hover:text-terracotta transition-colors"
          >
            ask the cook for ideas →
          </Link>
        </div>
      </div>

      <p className="mt-14 text-center small-caps text-[10px] text-ink-soft/70">
        kept privately on this device
      </p>
    </div>
  );
}

function BookShelf({
  books,
  countFor,
}: {
  books: Cookbook[];
  countFor: (id: string) => number;
}) {
  return (
    <div className="relative">
      {/* wooden shelf plank */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8 items-end pb-4">
        {books.map((b) => (
          <BookOnShelf key={b.id} book={b} count={countFor(b.id)} />
        ))}
      </div>
      <div
        aria-hidden
        className="h-3 rounded-sm shadow-[0_10px_18px_-10px_rgba(43,31,20,0.6)]"
        style={{
          background:
            "linear-gradient(to bottom, #7a5231, #4b2f18 60%, #2e1c0e)",
        }}
      />
      <div
        aria-hidden
        className="h-1 bg-black/30 mx-2 rounded-b-sm"
      />
    </div>
  );
}

function BookOnShelf({ book, count }: { book: Cookbook; count: number }) {
  const cover = `hsl(${book.hue} 40% 32%)`;
  const coverDeep = `hsl(${book.hue} 45% 22%)`;
  const gilt = `hsl(${book.hue} 50% 75%)`;

  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group block relative"
      style={{ perspective: "800px" }}
    >
      <div
        className="relative mx-auto w-full max-w-[190px] aspect-[3/4] rounded-[3px] shadow-[0_18px_28px_-14px_rgba(0,0,0,0.55),0_4px_10px_-4px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]"
        style={{
          background: `linear-gradient(135deg, ${cover}, ${coverDeep})`,
          transformOrigin: "bottom center",
        }}
      >
        {/* spine highlight */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-2 rounded-l-[3px]"
          style={{
            background:
              "linear-gradient(to right, rgba(255,255,255,0.14), rgba(0,0,0,0.35))",
          }}
        />
        {/* pages edge on right */}
        <div
          aria-hidden
          className="absolute inset-y-1 right-0 w-1"
          style={{
            background:
              "repeating-linear-gradient(to bottom, #f1e7ce 0 2px, #d9caa4 2px 3px)",
            borderRadius: "0 2px 2px 0",
          }}
        />
        {/* gilt frame */}
        <div
          className="absolute inset-4 rounded-[2px] flex flex-col items-center justify-center text-center px-2"
          style={{
            border: `1px solid ${gilt}`,
            boxShadow: `inset 0 0 0 3px transparent, inset 0 0 0 4px ${gilt}22`,
          }}
        >
          <span className="text-2xl mb-2 drop-shadow-sm">{book.emoji}</span>
          <p
            className="font-serif italic text-[15px] leading-tight"
            style={{ color: gilt }}
          >
            {book.name}
          </p>
          {book.subtitle && (
            <p
              className="mt-1 small-caps text-[8px]"
              style={{ color: `${gilt}cc` }}
            >
              {book.subtitle}
            </p>
          )}
          <div
            className="mt-3 h-px w-8"
            style={{ background: `${gilt}66` }}
          />
          <p
            className="mt-2 small-caps text-[8px]"
            style={{ color: `${gilt}aa` }}
          >
            {count === 0
              ? "empty"
              : `${count} ${count === 1 ? "entry" : "entries"}`}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center small-caps text-[9px] text-ink-soft">
        open volume
      </p>
    </Link>
  );
}

function NewBookForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCookbook({ name, subtitle });
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-[420px] mx-auto paper-page rounded-[3px] p-5"
    >
      <p className="small-caps text-[10px] text-terracotta text-center">
        bind a new volume
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Title (e.g. Cookies, Pastas)"
        className="mt-3 w-full bg-transparent border-b border-rule/60 py-2 font-serif italic text-lg outline-none focus:border-terracotta"
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="A short subtitle (optional)"
        className="mt-3 w-full bg-transparent border-b border-rule/40 py-2 text-sm outline-none focus:border-terracotta"
      />
      <div className="mt-5 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="small-caps text-[10px] text-ink-soft px-3 py-2"
        >
          cancel
        </button>
        <button
          type="submit"
          className="bg-ink text-paper text-sm px-4 py-2 rounded active:scale-95 transition-transform"
        >
          Bind volume
        </button>
      </div>
    </form>
  );
}

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

function SearchAllRecipes({
  recipes,
  books: _books,
}: {
  recipes: ReturnType<typeof useRecipes>;
  books: Cookbook[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [dishType, setDishType] = useState<string>("all");
  const [prepBucket, setPrepBucket] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"top" | "quick" | "newest" | "az">("top");
  const [pickFlash, setPickFlash] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => t && set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bucket = PREP_BUCKETS.find((b) => b.id === prepBucket) ?? PREP_BUCKETS[0];
    const list = recipes.filter((r) => {
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
    const sorted = [...list];
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
    } else {
      sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return sorted;
  }, [recipes, query, minRating, dishType, prepBucket, sortBy]);

  function reset() {
    setQuery("");
    setMinRating(0);
    setDishType("all");
    setPrepBucket("all");
    setSortBy("top");
  }

  function pickForMe() {
    if (filtered.length === 0) return;
    // Weight by rating: unrated = 1, rated = rating + 1 (so 5-star ~ 6x more likely than unrated)
    const weights = filtered.map((r) => (r.rating ?? 0) + 1);
    const total = weights.reduce((s, w) => s + w, 0);
    let pick = Math.random() * total;
    let chosen = filtered[0];
    for (let i = 0; i < filtered.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        chosen = filtered[i];
        break;
      }
    }
    setPickFlash(chosen.title);
    setTimeout(() => {
      router.navigate({ to: "/recipes/$id", params: { id: chosen.id } });
    }, 450);
  }

  return (
    <section className="mb-10">
      <div className="paper-page rounded-[3px] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 small-caps text-[11px] text-terracotta">
            <span>⌕</span>
            search all recipes
            <span className="text-ink-soft/70">· {recipes.length}</span>
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
            <input
              autoFocus
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
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent border-b border-rule/60 text-sm py-1 font-serif italic outline-none focus:border-terracotta max-w-[60%]"
                >
                  <option value="top">top rated</option>
                  <option value="quick">quickest first</option>
                  <option value="newest">most recent</option>
                  <option value="az">a → z</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="small-caps text-[10px] text-ink-soft">
                {filtered.length === 0
                  ? "nothing matches"
                  : `${filtered.length} of ${recipes.length}`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={pickForMe}
                  disabled={filtered.length === 0}
                  className="small-caps text-[10px] text-terracotta border border-terracotta/40 rounded-full px-3 py-1 hover:bg-terracotta hover:text-paper transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-terracotta"
                >
                  ✦ pick one for me
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="small-caps text-[10px] text-ink-soft/70 hover:text-terracotta"
                >
                  reset
                </button>
              </div>
            </div>

            {pickFlash && (
              <p className="mt-2 text-center font-serif italic text-[13px] text-terracotta">
                tonight: {pickFlash}…
              </p>
            )}

            <ul className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-rule/40 border-t border-rule/40">
              {filtered.map((r) => {
                const mins = parsePrepMinutes(r.prep_time);
                return (
                  <li key={r.id}>
                    <Link
                      to="/recipes/$id"
                      params={{ id: r.id }}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-terracotta/5 px-1 rounded transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-serif italic text-[15px] truncate">{r.title}</p>
                        <p className="small-caps text-[9px] text-ink-soft/80 mt-0.5 truncate">
                          {[r.tags[0], mins ? `${mins} min` : r.prep_time].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <StarRating value={r.rating ?? 0} readOnly size="sm" />
                    </Link>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-6 text-center small-caps text-[10px] text-ink-soft/70">
                  no recipes match these filters
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}



