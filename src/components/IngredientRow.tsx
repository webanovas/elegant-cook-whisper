import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { suggestSubstitute } from "@/lib/recipes.functions";
import { scaleAmount } from "@/lib/scale";
import type { Ingredient } from "@/lib/recipes.functions";

export function IngredientRow({
  ingredient,
  originalServings,
  currentServings,
  recipeTitle,
}: {
  ingredient: Ingredient;
  originalServings: number;
  currentServings: number;
  recipeTitle: string;
}) {
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alts, setAlts] = useState<Array<{ name: string; note: string }> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const suggest = useServerFn(suggestSubstitute);

  const scaledAmount = scaleAmount(
    ingredient.amount ?? "",
    originalServings,
    currentServings,
  );

  async function handleSuggest() {
    if (!open) setOpen(true);
    if (alts || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await suggest({
        data: { ingredient: ingredient.name, recipeTitle },
      });
      setAlts(res.alternatives);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="group">
      <div className="flex justify-between items-baseline gap-3">
        <button
          type="button"
          onClick={() => setChecked((c) => !c)}
          className="flex-1 flex items-baseline gap-2 text-left"
        >
          <motion.span
            animate={{
              opacity: checked ? 0.35 : 1,
              textDecoration: checked ? "line-through" : "none",
            }}
            transition={{ duration: 0.3 }}
            className="flex items-baseline gap-2 flex-1"
          >
            <span className="text-sm font-medium tabular-nums">
              {scaledAmount}
              {ingredient.unit ? ` ${ingredient.unit}` : ""}
            </span>
            <span className="text-sm text-foreground/70 text-pretty">
              {ingredient.name}
            </span>
          </motion.span>
        </button>
        <button
          type="button"
          onClick={handleSuggest}
          className="text-[10px] font-medium uppercase tracking-wider text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
        >
          Sub
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm">
              {loading && (
                <p className="text-muted-foreground italic">Thinking of alternatives…</p>
              )}
              {error && <p className="text-destructive text-xs">{error}</p>}
              {alts?.map((a, i) => (
                <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-primary/10" : ""}>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
