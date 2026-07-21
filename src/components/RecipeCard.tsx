import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Recipe } from "@/lib/recipes.functions";

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const totalTime =
    [recipe.prep_time, recipe.cook_time].filter(Boolean).join(" + ") || "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link
        to="/recipes/$id"
        params={{ id: recipe.id }}
        className="block"
      >
        <div className="relative overflow-hidden rounded-xl mb-3 bg-muted outline outline-1 -outline-offset-1 outline-black/5">
          <motion.div
            layoutId={`recipe-hero-${recipe.id}`}
            className="w-full aspect-[4/3]"
          >
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-muted to-secondary">
                <span className="font-serif italic text-2xl text-muted-foreground/50">
                  {recipe.title.slice(0, 1)}
                </span>
              </div>
            )}
          </motion.div>
          {totalTime && (
            <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium ring-1 ring-black/5">
              {totalTime}
            </div>
          )}
        </div>
        <h3 className="font-serif text-lg leading-snug text-balance group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>
        {recipe.tags.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-tighter">
            {recipe.tags.slice(0, 2).join(" • ")}
          </p>
        )}
      </Link>
    </motion.article>
  );
}
