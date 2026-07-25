import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Recipe } from "@/lib/recipes-store";
import { useRecipeImage } from "@/lib/recipe-images";
import { StarRating } from "@/components/StarRating";

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const imgSrc = useRecipeImage(recipe.id, recipe.image_url);
  const totalTime =
    [recipe.prep_time, recipe.cook_time].filter(Boolean).join(" + ") || "";
  const chapter = String(index + 1).padStart(2, "0");

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link to="/recipes/$id" params={{ id: recipe.id }} className="block">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="small-caps text-[9px] text-terracotta">
            pl {chapter}
          </span>
          <span className="flex-1 h-px bg-rule/40" />
          {totalTime && (
            <span className="small-caps text-[9px] text-ink-soft truncate max-w-[60%]">
              {totalTime}
            </span>
          )}
        </div>

        <div className="w-full aspect-[4/3] overflow-hidden bg-muted border border-rule/40 shadow-[0_10px_20px_-14px_rgba(43,31,20,0.5)]">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-paper-deep to-muted">
              <span className="font-serif italic text-3xl text-ink/30">
                {recipe.title.slice(0, 1)}
              </span>
            </div>
          )}
        </div>

        <h3 className="mt-3 font-serif text-[15px] sm:text-base italic leading-snug text-balance line-clamp-2 group-hover:text-terracotta transition-colors">
          {recipe.title}
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          {recipe.tags.length > 0 ? (
            <p className="small-caps text-[9px] text-ink-soft truncate">
              {recipe.tags.slice(0, 2).join(" · ")}
            </p>
          ) : <span />}
          <div className="shrink-0">
            {!recipe.rating || recipe.rating === 0 ? (
              <span className="small-caps text-[8px] text-ink-soft/60">unrated</span>
            ) : (
              <StarRating value={recipe.rating} readOnly size="sm" />
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
