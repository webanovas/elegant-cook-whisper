import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeAchievements } from "@/lib/achievements";
import type { Recipe } from "@/lib/recipes-store";
import { useT } from "@/lib/i18n";

export function useAchievements(recipes: Recipe[]) {
  return useMemo(() => computeAchievements(recipes), [recipes]);
}

/** Tiny pill that lives in the header row. */
export function AchievementsPill({
  recipes,
  open,
  onToggle,
}: {
  recipes: Recipe[];
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const all = useAchievements(recipes);
  const unlocked = all.filter((a) => a.unlocked).length;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={t("ach_title")}
      title={t("ach_title")}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] small-caps tabular-nums transition-colors ${
        open
          ? "border-terracotta text-terracotta"
          : "border-rule/50 text-ink-soft hover:text-terracotta"
      }`}
      dir="ltr"
    >
      <span aria-hidden="true">❦</span>
      <span>
        {unlocked}/{all.length}
      </span>
    </button>
  );
}

/** Full badge grid, revealed only when the pill is toggled on. */
export function AchievementsPanel({
  recipes,
  open,
}: {
  recipes: Recipe[];
  open: boolean;
}) {
  const t = useT();
  const all = useAchievements(recipes);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="ach-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.22 },
          }}
          className="overflow-hidden"
        >
          <div className="pt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((a) => {
              const pct = Math.round((a.progress / a.goal) * 100);
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-2.5 rounded-[3px] border px-3 py-2 ${
                    a.unlocked ? "border-terracotta/40 bg-terracotta/5" : "border-rule/40"
                  }`}
                >
                  <span
                    className={`text-[15px] leading-none mt-0.5 ${a.unlocked ? "" : "opacity-30 grayscale"}`}
                    aria-hidden="true"
                  >
                    {a.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-serif italic text-[13px] leading-snug ${
                        a.unlocked ? "text-ink" : "text-ink-soft"
                      }`}
                    >
                      {t(a.nameKey)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-soft leading-snug">
                      {t(a.descKey).replace("{n}", String(a.goal))}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex-1 h-[2px] bg-rule/40 rounded-full overflow-hidden">
                        <motion.span
                          className="block h-full bg-terracotta"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </span>
                      <span
                        dir="ltr"
                        className="small-caps text-[9px] text-ink-soft tabular-nums shrink-0"
                      >
                        {a.progress}/{a.goal}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
