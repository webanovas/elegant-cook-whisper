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
      className="group relative"
    >
      <Link
        to="/recipes/$id"
        params={{ id: recipe.id }}
        className="block"
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

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-paper/95 backdrop-blur-[2px] border border-rule/50 p-3 text-center"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-terracotta text-paper small-caps text-[10px] tracking-wide"
              >
                <Trash2 className="w-3 h-3" />
                {t("delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 border border-rule small-caps text-[10px] tracking-wide text-ink-soft"
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
