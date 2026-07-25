import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { suggestSubstitute } from "@/lib/recipes.functions";
import { scaleAmount } from "@/lib/scale";
import type { Ingredient } from "@/lib/recipes.functions";
import { useT } from "@/lib/i18n";

type Alt = { name: string; amount: string; note: string };

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
  const [moreLoading, setMoreLoading] = useState(false);
  const [alts, setAlts] = useState<Alt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggest = useServerFn(suggestSubstitute);
  const t = useT();

  const scaledAmount = scaleAmount(
    ingredient.amount ?? "",
    originalServings,
    currentServings,
  );

  async function fetchAlts(mode: "initial" | "more") {
    if (mode === "initial") setLoading(true);
    else setMoreLoading(true);
    setError(null);
    try {
      const res = await suggest({
        data: {
          ingredient: ingredient.name,
          recipeTitle,
          exclude: mode === "more" ? (alts ?? []).map((a) => a.name) : [],
          count: mode === "more" ? 2 : 2,
        },
      });
      setAlts((prev) => (mode === "more" && prev ? [...prev, ...res.alternatives] : res.alternatives));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setMoreLoading(false);
    }
  }

  async function handleSuggest() {
    if (!open) setOpen(true);
    if (alts || loading) return;
    await fetchAlts("initial");
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
            <span className="flex items-baseline gap-2 flex-1">
              <span className="text-sm font-medium tabular-nums" dir="ltr">
                {scaledAmount}
                {ingredient.unit ? ` ${ingredient.unit}` : ""}
              </span>
              <span className="text-sm text-foreground/70 text-pretty">
                {ingredient.name}
              </span>
            </span>
          </motion.span>
        </button>
        <button
          type="button"
          onClick={handleSuggest}
          className="text-[10px] font-medium uppercase tracking-wider text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {t("sub")}
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
                <p className="text-muted-foreground italic">{t("substitute_loading")}</p>
              )}

              {error && <p className="text-destructive text-xs">{error}</p>}
              {alts?.map((a, i) => (
                <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-primary/10" : ""}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{a.name}</p>
                    {a.amount && (
                      <span className="text-[10px] uppercase tracking-wider text-terracotta font-semibold shrink-0">
                        {a.amount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>
                </div>
              ))}

              {alts && alts.length > 0 && (
                <div className="mt-3 pt-2 border-t border-primary/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fetchAlts("more")}
                    disabled={moreLoading}
                    className="text-[10px] uppercase tracking-widest text-primary font-semibold disabled:opacity-50"
                  >
                    {moreLoading ? t("substitute_loading") : `+ ${t("more_subs")}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    {t("close")}
                  </button>
                </div>
              )}

              {!alts && !loading && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  {t("close")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

