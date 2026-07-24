import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRecipe } from "@/lib/recipes-store";
import { CookTimer } from "@/components/CookTimer";
import { useLang, useT } from "@/lib/i18n";

export const Route = createFileRoute("/recipes/$id/cook")({
  ssr: false,
  head: () => ({ meta: [{ title: "Cook Mode — Gourmet Notes" }] }),
  component: CookMode,
});

function CookMode() {
  const { id } = Route.useParams();
  const recipe = useRecipe(id);
  const t = useT();
  const lang = useLang();
  const rtl = lang === "he";
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [chromeHidden, setChromeHidden] = useState(false);

  // Flatten sections with section-title dividers, so multi-component recipes read cleanly.
  const steps = useMemo(() => {
    if (!recipe) return [] as Array<{ text: string; section?: string }>;
    if (recipe.instruction_sections && recipe.instruction_sections.length > 0) {
      const out: Array<{ text: string; section?: string }> = [];
      recipe.instruction_sections.forEach((sec) => {
        sec.steps.forEach((s, i) =>
          out.push({ text: s, section: i === 0 ? sec.title : undefined }),
        );
      });
      return out;
    }
    return recipe.instructions.map((s) => ({ text: s }));
  }, [recipe]);

  if (!recipe) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-background">
        <div className="text-center">
          <p className="font-serif text-xl">{t("cook_not_found")}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            {t("back_cookbook")}
          </Link>
        </div>
      </div>
    );
  }

  const total = steps.length;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= total) return;
    setDirection(delta);
    setIndex(next);
  }

  if (total === 0) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-background">
        <div className="text-center">
          <p className="font-serif text-xl">{t("no_steps")}</p>
          <Link
            to="/recipes/$id"
            params={{ id }}
            className="mt-4 inline-block text-sm text-primary underline"
          >
            {t("back_recipe")}
          </Link>
        </div>
      </div>
    );
  }

  // In RTL, "next" content should slide in from the left (visually the same
  // logical direction as LTR). Flip the sign so the animation reads naturally.
  const slideSign = rtl ? -1 : 1;
  const current = steps[index];

  return (
    <div className="min-h-screen h-[100dvh] bg-background text-foreground flex flex-col">
      <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col overflow-hidden">
        <header
          className={`p-6 flex justify-between items-center transition-opacity duration-300 ${
            chromeHidden ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link
            to="/recipes/$id"
            params={{ id }}
            className="text-[10px] uppercase tracking-widest font-medium"
          >
            {t("exit")}
          </Link>
          <div className="flex gap-1" dir="ltr">
            {steps.map((_step, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-primary"
                    : i < index
                      ? "w-4 bg-primary/40"
                      : "w-4 bg-border"
                }`}
              />
            ))}
          </div>
          <span dir="ltr" className="text-[10px] font-medium tabular-nums">
            {index + 1} / {total}
          </span>
        </header>

        <main
          className="flex-1 flex flex-col justify-center px-8 text-center overflow-hidden relative cursor-pointer"
          onClick={() => setChromeHidden((v) => !v)}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction * slideSign * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * slideSign * 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10"
            >
              {current.section && (
                <span className="small-caps text-[11px] text-terracotta mb-2 block">
                  {current.section}
                </span>
              )}
              <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4 block">
                {t("step")} {index + 1}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl leading-snug text-balance">
                {current.text}
              </h2>
            </motion.div>
          </AnimatePresence>

          <div onClick={(e) => e.stopPropagation()}>
            <CookTimer />
          </div>

          {chromeHidden && (
            <p className="absolute bottom-4 left-0 right-0 text-center small-caps text-[9px] text-ink-soft/60">
              {t("tap_show")}
            </p>
          )}
        </main>

        <footer
          className={`p-6 grid grid-cols-2 gap-4 transition-opacity duration-300 ${
            chromeHidden ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="py-4 rounded-xl border border-border text-sm font-medium disabled:opacity-40"
          >
            {t("previous")}
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              className="py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              {t("next_step")}
            </button>
          ) : (
            <Link
              to="/recipes/$id"
              params={{ id }}
              className="py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium grid place-items-center"
            >
              {t("finish")}
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
