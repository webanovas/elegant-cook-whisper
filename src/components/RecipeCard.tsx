import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { deleteRecipeLocal, type Recipe } from "@/lib/recipes-store";
import { useRecipeImage } from "@/lib/recipe-images";
import { StarRating } from "@/components/StarRating";
import { useT } from "@/lib/i18n";

const LONG_PRESS_MS = 550;

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const t = useT();
  const imgSrc = useRecipeImage(recipe.id, recipe.image_url);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const totalTime =
    [recipe.prep_time, recipe.cook_time].filter(Boolean).join(" + ") || "";
  const chapter = String(index + 1).padStart(2, "0");

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function startPress() {
    if (confirming) return;
    longPressed.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
      setConfirming(true);
    }, LONG_PRESS_MS);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className="group relative mb-8 break-inside-avoid"
    >
      <Link
        to="/recipes/$id"
        params={{ id: recipe.id }}
        className="block rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 active:scale-[0.98]"
        onPointerDown={startPress}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={(e) => {
          e.preventDefault();
          setConfirming(true);
        }}
        onClick={(e) => {
          if (longPressed.current || confirming) {
            e.preventDefault();
            longPressed.current = false;
          }
        }}
      >
        <div className={`w-full overflow-hidden rounded-[2rem] bg-muted border border-rule/50 shadow-[0_24px_54px_-30px_color-mix(in_oklab,var(--ink)_45%,transparent)] transition-all duration-700 group-hover:-translate-y-1.5 group-hover:shadow-[0_32px_68px_-30px_color-mix(in_oklab,var(--ink)_42%,transparent)] ${index % 3 === 1 ? "aspect-[4/5]" : index % 3 === 2 ? "aspect-square" : "aspect-[5/6]"}`}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.055]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-paper-deep to-muted">
              <span className="font-serif italic text-3xl text-ink/30">
                {recipe.title.slice(0, 1)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 px-1">
          <span className="small-caps text-[9px] text-terracotta">{recipe.tags[0] || `pl ${chapter}`}</span>
          {totalTime && <span className="text-[10px] text-ink-soft truncate">{totalTime}</span>}
        </div>

        <h3 className="mt-2 px-1 font-serif text-[1.65rem] leading-[1.05] text-balance line-clamp-2 group-hover:text-terracotta transition-colors">
          {recipe.title}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          {recipe.description ? <p className="text-sm leading-relaxed text-ink-soft line-clamp-2">{recipe.description}</p> : <span />}
          <div className="shrink-0">
            {!recipe.rating || recipe.rating === 0 ? (
              <span className="small-caps text-[8px] text-ink-soft/60">{chapter}</span>
            ) : (
              <StarRating value={recipe.rating} readOnly size="sm" />
            )}
          </div>
        </div>
      </Link>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-paper/95 backdrop-blur-md border border-rule/60 p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif italic text-[13px] leading-snug text-ink">
              {t("confirm_delete_recipe")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  deleteRecipeLocal(recipe.id);
                  setConfirming(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 bg-terracotta text-paper small-caps text-[10px] tracking-wide"
              >
                <Trash2 className="w-3 h-3" />
                {t("delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-4 py-2 border border-rule small-caps text-[10px] tracking-wide text-ink-soft"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
