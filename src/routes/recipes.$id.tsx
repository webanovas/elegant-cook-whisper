import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { deleteRecipe, getRecipe } from "@/lib/recipes.functions";
import { PortionScaler } from "@/components/PortionScaler";
import { IngredientRow } from "@/components/IngredientRow";

const recipeQuery = (id: string) =>
  queryOptions({
    queryKey: ["recipe", id],
    queryFn: () => getRecipe({ data: { id } }),
  });

export const Route = createFileRoute("/recipes/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(recipeQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Gourmet Notes` },
          {
            name: "description",
            content: loaderData.description ?? `${loaderData.title} recipe`,
          },
          { property: "og:title", content: loaderData.title },
          {
            property: "og:description",
            content: loaderData.description ?? "",
          },
          ...(loaderData.image_url
            ? [
                { property: "og:image", content: loaderData.image_url },
                { property: "twitter:image", content: loaderData.image_url },
              ]
            : []),
        ]
      : [{ title: "Recipe — Gourmet Notes" }],
  }),
  component: RecipeDetail,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <p className="font-serif text-xl">Recipe unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to cookbook
        </Link>
      </div>
    </div>
  ),
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const { data: recipe } = useSuspenseQuery(recipeQuery(id));
  const [servings, setServings] = useState(recipe.servings || 2);
  const router = useRouter();
  const remove = useServerFn(deleteRecipe);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    try {
      await remove({ data: { id: recipe.id } });
      router.navigate({ to: "/" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-[440px] mx-auto relative">
        {/* Hero */}
        <div className="relative">
          <motion.div
            layoutId={`recipe-hero-${recipe.id}`}
            className="w-full aspect-[4/5] bg-muted overflow-hidden"
          >
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-muted to-secondary">
                <span className="font-serif italic text-6xl text-muted-foreground/30">
                  {recipe.title.slice(0, 1)}
                </span>
              </div>
            )}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
          <Link
            to="/"
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-md size-9 rounded-full grid place-items-center text-sm shadow-sm"
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
            <p className="text-sm text-muted-foreground italic text-pretty mb-6">
              {recipe.description}
            </p>
          )}

          <div className="flex justify-between py-6 border-y border-border">
            <MetaCell label="Prep" value={recipe.prep_time || "—"} />
            <div className="w-px bg-border" />
            <MetaCell label="Cook" value={recipe.cook_time || "—"} />
            <div className="w-px bg-border" />
            <div className="text-center">
              <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                Serves
              </span>
              <PortionScaler servings={servings} onChange={setServings} />
            </div>
          </div>

          {/* Ingredients */}
          <section className="py-8">
            <h3 className="font-serif text-xl mb-6">Ingredients</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No ingredients listed.</p>
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

          {/* Instructions */}
          <section className="pb-8">
            <h3 className="font-serif text-xl mb-6">Method</h3>
            <div className="space-y-8">
              {recipe.instructions.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <span className="font-serif text-primary/40 text-2xl leading-none italic tabular-nums shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-pretty">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground pt-6 border-t border-border">
            {recipe.source_url ? (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Original source
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-destructive/70 hover:text-destructive"
            >
              {deleting ? "Removing…" : "Delete"}
            </button>
          </div>
        </motion.div>

        {/* Floating Cook Mode bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[392px] z-50">
          <Link
            to="/recipes/$id/cook"
            params={{ id: recipe.id }}
            className="w-full bg-foreground text-background py-4 rounded-full font-medium text-sm flex items-center justify-center gap-2 shadow-xl ring-1 ring-foreground/10"
          >
            Start Cook Mode
          </Link>
        </div>
      </div>
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
