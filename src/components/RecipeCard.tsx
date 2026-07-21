import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Recipe } from "@/lib/recipes-store";
import { useRecipeImage } from "@/lib/recipe-images";

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const imgSrc = useRecipeImage(recipe.id, recipe.image_url);
  const totalTime =
    [recipe.prep_time, recipe.cook_time].filter(Boolean).join(" + ") || "";
  const chapter = String(index + 1).padStart(2, "0");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link to="/recipes/$id" params={{ id: recipe.id }} className="block">
        {/* Chapter marker + title line, book-style */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="small-caps text-[10px] text-terracotta">
            plate {chapter}
          </span>
          <span className="flex-1 h-px bg-rule/40" />
          {totalTime && (
            <span className="small-caps text-[10px] text-ink-soft">
              {totalTime}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="w-full aspect-[4/3] overflow-hidden bg-muted border border-rule/40 shadow-[0_18px_30px_-20px_rgba(43,31,20,0.5)]">
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
                <span className="font-serif italic text-4xl text-ink/30">
                  {recipe.title.slice(0, 1)}
                </span>
              </div>
            )}
          </div>

          {/* Hand-inscribed caption under the plate */}
          <div className="absolute -bottom-3 left-3 right-3 flex justify-center pointer-events-none">
            <span className="small-caps text-[9px] text-ink-soft bg-paper px-2">
              a plate from the kitchen
            </span>
          </div>
        </div>

        <h3 className="mt-6 font-serif text-2xl italic leading-snug text-balance group-hover:text-terracotta transition-colors">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft line-clamp-2 font-serif">
            {recipe.description}
          </p>
        )}

        {recipe.tags.length > 0 && (
          <p className="mt-3 small-caps text-[10px] text-ink-soft">
            {recipe.tags.slice(0, 3).join(" · ")}
          </p>
        )}
      </Link>
    </motion.article>
  );
}
