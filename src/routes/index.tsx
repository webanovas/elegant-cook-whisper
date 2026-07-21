import { createFileRoute, useRouter } from "@tanstack/react-router";
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
      { title: "Gourmet Notes — Your modern cookbook" },
      {
        name: "description",
        content:
          "Save any recipe from the web with AI, scale portions, and cook in a focused step-by-step mode.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQuery),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[440px] mx-auto pb-16">
        <Header />
        <ImportCard />
        <Suspense fallback={<GridSkeleton />}>
          <RecipeGrid />
        </Suspense>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="pt-12 px-6 pb-6">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-4xl leading-tight text-balance"
      >
        Gourmet Notes
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-2 text-sm italic text-muted-foreground"
      >
        A quiet little cookbook for the curious cook.
      </motion.p>
    </header>
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
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mx-6 mb-10"
    >
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-wider text-primary font-medium mb-2">
          Import from the web
        </p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste recipe URL…"
            className="flex-1 bg-card border-none rounded py-2 px-3 text-sm shadow-sm ring-1 ring-black/5 outline-none focus:ring-primary/40"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Reading…" : "Add"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-destructive leading-relaxed">{error}</p>
        )}
        {loading && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            Extracting, styling, and photographing your recipe…
          </p>
        )}
      </div>
    </motion.section>
  );
}

function RecipeGrid() {
  const { data: recipes } = useSuspenseQuery(recipesQuery);

  return (
    <main className="px-6">
      <div className="flex justify-between items-end mb-6">
        <h2 className="font-serif text-xl">Recent Plates</h2>
        <span className="text-xs text-muted-foreground">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </span>
      </div>
      {recipes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {recipes.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <p className="font-serif italic text-lg text-muted-foreground">
        Your cookbook is empty.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a recipe URL above to begin.
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <main className="px-6">
      <div className="h-6 w-32 bg-muted rounded animate-pulse mb-6" />
      <div className="space-y-8">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-[4/3] bg-muted rounded-xl mb-3" />
            <div className="h-5 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
