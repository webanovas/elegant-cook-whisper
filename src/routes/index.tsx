import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { extractRecipe, listRecipes } from "@/lib/recipes.functions";
import { RecipeCard } from "@/components/RecipeCard";

const recipesQuery = queryOptions({
  queryKey: ["recipes"],
  queryFn: () => listRecipes(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gourmet Notes — A private cookbook" },
      {
        name: "description",
        content:
          "A vintage-bound cookbook you keep. Save any recipe from the web, scale portions, and cook step by step.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen py-6 sm:py-10 px-3">
      <div className="max-w-[520px] mx-auto paper-page rounded-[3px] book-spine overflow-hidden">
        <div className="paper-page-inner px-6 pt-14 pb-16">
          <Cover />
          <Suspense fallback={<GridSkeleton />}>
            <Contents />
          </Suspense>
        </div>
      </div>
      <p className="mt-6 text-center small-caps text-[10px] text-ink-soft/70">
        Volume I · Kept privately
      </p>
    </div>
  );
}

function Cover() {
  return (
    <header className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="small-caps text-[11px] text-terracotta"
      >
        being a personal
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="mt-2 font-serif text-[3.4rem] leading-[0.95] tracking-tight"
      >
        <span className="italic">Gourmet</span>
        <br />
        Notes
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        className="mx-auto mt-5 flex items-center gap-3 max-w-[240px]"
      >
        <span className="flex-1 h-px bg-rule/60" />
        <span className="text-gold text-lg">❦</span>
        <span className="flex-1 h-px bg-rule/60" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-5 font-serif italic text-[15px] text-ink-soft text-balance leading-relaxed"
      >
        A private cookbook, kept quietly.
        <br />
        Clip a recipe from the web, or ask the cook what to make.
      </motion.p>
    </header>
  );
}

function Contents() {
  const { data: recipes } = useSuspenseQuery(recipesQuery);

  return (
    <>
      <div className="mt-10 space-y-5">
        <ImportCard />
        <AskTheCookCard />
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
    </>
  );
}

function ImportCard() {
  const router = useRouter();
  const extract = useServerFn(extractRecipe);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const recipe = await extract({ data: { url: url.trim() } });
      setUrl("");
      router.navigate({ to: "/recipes/$id", params: { id: recipe.id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className=""
    >
      <p className="small-caps text-[10px] text-terracotta text-center">
        clip from the web
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
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
      {error && (
        <p className="mt-2 text-xs text-destructive italic">{error}</p>
      )}
      {loading && (
        <p className="mt-2 text-xs text-ink-soft italic">
          Transcribing to a fresh page & plating a picture…
        </p>
      )}
    </motion.section>
  );
}

function AskTheCookCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      <Link
        to="/chat"
        className="group relative block overflow-hidden rounded-lg border border-terracotta/25 bg-gradient-to-br from-terracotta/[0.08] to-terracotta/[0.02] p-4 transition-all hover:border-terracotta/50 hover:shadow-[0_12px_28px_-14px_color-mix(in_oklab,var(--terracotta)_35%,transparent)]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-primary-foreground shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20a8 8 0 0 0 8-8c0-4-8-13-8-13S4 8 4 12a8 8 0 0 0 8 8Z" />
              <path d="M9 13h6" />
              <path d="M12 10v6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[17px] italic leading-tight text-ink group-hover:text-terracotta transition-colors">
              Ask the Cook
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
              Can't decide? Chat with the resident chef to find a saved recipe or discover something new.
            </p>
          </div>
          <span className="text-terracotta text-lg transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function SectionHeading({ count }: { count: number }) {
  return (
    <div className="mt-2">
      <div className="ornament-rule">
        <span className="text-gold">❦</span>
      </div>
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl italic">The Kitchen</h2>
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
      <p className="font-serif italic text-lg text-ink">
        The pages are blank.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Clip a recipe above, or{" "}
        <Link to="/chat" className="text-terracotta underline underline-offset-4">
          ask the cook
        </Link>{" "}
        for ideas.
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-12">
      <div className="h-6 w-32 bg-muted/60 rounded animate-pulse mb-6" />
      <div className="space-y-10">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-[4/3] bg-muted/60 rounded mb-3" />
            <div className="h-5 w-2/3 bg-muted/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
