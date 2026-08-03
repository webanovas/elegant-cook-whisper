import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeAchievements } from "@/lib/achievements";
import type { Recipe } from "@/lib/recipes-store";
import { useT } from "@/lib/i18n";

export function AchievementsStrip({ recipes }: { recipes: Recipe[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const all = useMemo(() => computeAchievements(recipes), [recipes]);
  const unlocked = all.filter((a) => a.unlocked);
  const preview = (unlocked.length > 0 ? unlocked : all).slice(0, 5);

  return (
    <section className="paper-page rounded-[3px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-start"
      >
        <span className="small-caps text-[11px] text-terracotta shrink-0">
          {t("ach_title")}
        </span>
        <span className="flex items-center gap-1 min-w-0" aria-hidden="true">
          {preview.map((a) => (
            <span
              key={a.id}
              className={`text-[13px] leading-none ${a.unlocked ? "" : "opacity-25 grayscale"}`}
            >
              {a.glyph}
            </span>
          ))}
        </span>
        <span className="small-caps text-[10px] text-ink-soft ms-auto shrink-0" dir="ltr">
          {unlocked.length}/{all.length}
        </span>
        <span
          className={`text-terracotta text-[10px] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

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
            <div className="border-t border-rule/40 px-4 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((a) => {
                const pct = Math.round((a.progress / a.goal) * 100);
                return (
                  <div
                    key={a.id}
                    className={`flex items-start gap-3 rounded-[3px] border px-3 py-2 transition-colors ${
                      a.unlocked
                        ? "border-terracotta/40 bg-terracotta/5"
                        : "border-rule/40"
                    }`}
                  >
                    <span
                      className={`text-[18px] leading-none mt-0.5 ${a.unlocked ? "" : "opacity-30 grayscale"}`}
                      aria-hidden="true"
                    >
                      {a.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-serif italic text-[14px] leading-snug ${
                          a.unlocked ? "text-ink" : "text-ink-soft"
                        }`}
                      >
                        {t(a.nameKey)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-soft leading-snug">
                        {t(a.descKey).replace("{n}", String(a.goal))}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="flex-1 h-[3px] bg-rule/40 rounded-full overflow-hidden">
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
    </section>
  );
}
