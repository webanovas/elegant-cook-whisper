import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  extractRecipe,
  searchRecipesOnWeb,
  type WebRecipeResult,
} from "@/lib/recipes.functions";
import { classifyRecipeIntoBook } from "@/lib/classify.functions";
import {
  saveRecipe,
  useRecipesInBook,
  deleteRecipesInBook,
} from "@/lib/recipes-store";

import {
  useCookbook,
  useCookbooks,
  createCookbook,
  deleteCookbook,
  GENERAL_BOOK,
} from "@/lib/cookbooks-store";
import { RecipeCard } from "@/components/RecipeCard";

export const Route = createFileRoute("/books/$id")({
  ssr: false,
  head: () => ({
    meta: [{ title: "A cookbook — Gourmet Notes" }],
  }),
  component: BookPage,
});

function BookPage() {
  const { id } = Route.useParams();
  const book = useCookbook(id);
  const recipes = useRecipesInBook(id);
  const router = useRouter();

  if (!book) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center">
          <p className="font-serif text-xl italic">This volume isn't on the shelf.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-terracotta underline">
            Back to the shelf
          </Link>
        </div>
      </div>
    );
  }

  function onDeleteBook() {
    if (book!.id === GENERAL_BOOK.id) return;
    if (
      !confirm(
        `Remove "${book!.name}" and everything in it? This can't be undone.`,
      )
    )
      return;
    deleteRecipesInBook(book!.id);
    deleteCookbook(book!.id);
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3">
      <div className="max-w-[520px] mx-auto">
        <nav className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="small-caps text-[10px] text-ink-soft hover:text-terracotta transition-colors"
          >
            ← the shelf
          </Link>
          {book.id !== GENERAL_BOOK.id && (
            <button
              onClick={onDeleteBook}
              className="small-caps text-[10px] text-ink-soft/70 hover:text-destructive transition-colors"
            >
              discard volume
            </button>
          )}
        </nav>

        <div className="paper-page rounded-[3px] book-spine overflow-hidden">
          <div className="paper-page-inner px-6 pt-12 pb-16">
            <BookTitle
              name={book.name}
              subtitle={book.subtitle}
              emoji={book.emoji}
            />

            <div className="mt-10">
              <ImportCard bookId={book.id} />
            </div>

            <div className="mt-12">
              <SectionHeading count={recipes.length} />
              {recipes.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-10">
                  {recipes.map((r, i) => (
                    <RecipeCard key={r.id} recipe={r} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center small-caps text-[10px] text-ink-soft/70">
          from the shelf of Gourmet Notes
        </p>
      </div>
    </div>
  );
}

function BookTitle({
  name,
  subtitle,
  emoji,
}: {
  name: string;
  subtitle: string | null;
  emoji: string;
}) {
  return (
    <header className="text-center">
      <p className="small-caps text-[11px] text-terracotta">volume</p>
      <p className="mt-2 text-3xl">{emoji}</p>
      <h1 className="mt-2 font-serif italic text-[2.6rem] leading-[1] tracking-tight">
        {name}
      </h1>
      {subtitle && (
        <p className="mt-3 font-serif italic text-[14px] text-ink-soft">
          {subtitle}
        </p>
      )}
      <div className="mx-auto mt-5 flex items-center gap-3 max-w-[220px]">
        <span className="flex-1 h-px bg-rule/60" />
        <span className="text-gold text-lg">❦</span>
        <span className="flex-1 h-px bg-rule/60" />
      </div>
    </header>
  );
}

function ImportCard({ bookId }: { bookId: string }) {
  const router = useRouter();
  const extract = useServerFn(extractRecipe);
  const classify = useServerFn(classifyRecipeIntoBook);
  const search = useServerFn(searchRecipesOnWeb);
  const [mode, setMode] = useState<"url" | "search">("url");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WebRecipeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSort, setAutoSort] = useState(bookId === GENERAL_BOOK.id);
  const [note, setNote] = useState<string | null>(null);
  const books = useCookbooks();

  async function importFromUrl(sourceUrl: string) {
    setLoading(true);
    setError(null);
    setNote(null);
    setImportingUrl(sourceUrl);
    try {
      const extracted = await extract({ data: { url: sourceUrl } });

      let targetBook = bookId;
      let noteMsg: string | null = null;

      if (autoSort) {
        const bookList = books
          .filter((b) => b.id !== GENERAL_BOOK.id)
          .map((b) => ({ id: b.id, name: b.name, subtitle: b.subtitle }));

        const result = await classify({
          data: {
            title: extracted.title,
            description: extracted.description,
            tags: extracted.tags,
            books: bookList,
          },
        });

        if (result.bookId) {
          targetBook = result.bookId;
          const match = books.find((b) => b.id === result.bookId);
          noteMsg = match ? `Sorted into "${match.name}."` : null;
        } else if (result.suggestedNewBook) {
          const newBook = createCookbook({ name: result.suggestedNewBook });
          targetBook = newBook.id;
          noteMsg = `Bound a new volume: "${newBook.name}."`;
        }
      }

      const saved = saveRecipe({ ...extracted, cookbook_id: targetBook });
      setUrl("");
      if (noteMsg && targetBook !== bookId) {
        setNote(noteMsg);
        setTimeout(() => {
          router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
        }, 900);
      } else {
        router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
      }
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
    <section>
      <p className="small-caps text-[10px] text-terracotta text-center">
        clip a recipe
      </p>

      <div className="mt-3 flex items-center justify-center gap-2">
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

      <label className="mt-3 flex items-center justify-center gap-2 text-[11px] text-ink-soft cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoSort}
          onChange={(e) => setAutoSort(e.target.checked)}
          className="accent-terracotta"
        />
        <span className="small-caps">let the cook sort it for me</span>
      </label>
      {error && <p className="mt-2 text-xs text-destructive italic text-center">{error}</p>}
      {loading && (
        <p className="mt-2 text-xs text-ink-soft italic text-center">
          Transcribing to a fresh page & plating a picture…
        </p>
      )}
      {note && (
        <p className="mt-2 text-xs text-terracotta italic text-center">{note}</p>
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


function SectionHeading({ count }: { count: number }) {
  return (
    <div className="mt-2">
      <div className="ornament-rule">
        <span className="text-gold">❦</span>
      </div>
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl italic">Contents</h2>
        <span className="small-caps text-[10px] text-ink-soft">
          {count === 0 ? "no entries" : `${count} ${count === 1 ? "entry" : "entries"}`}
        </span>
      </div>
      <div className="mt-1 h-px bg-ink/15" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 text-center py-14 border border-dashed border-rule/60 rounded-md bg-paper-deep/30">
      <p className="font-serif italic text-lg text-ink">The pages are blank.</p>
      <p className="mt-2 text-sm text-ink-soft">
        Clip a recipe above to begin this volume.
      </p>
    </div>
  );
}
