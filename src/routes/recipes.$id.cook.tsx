import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRecipe } from "@/lib/recipes-store";
import { CookTimer } from "@/components/CookTimer";
import { useLang, useT } from "@/lib/i18n";
import { TimedText } from "@/components/TimedText";
import { useWakeLock } from "@/hooks/use-wake-lock";


export const Route = createFileRoute("/recipes/$id/cook")({
  ssr: false,
  head: () => ({ meta: [{ title: "Cook Mode — CookNotes" }] }),
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
  useWakeLock(true);


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
    return recipe.instructions.map((s) => ({ text: s, section: undefined as string | undefined }));
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

  const slideSign = rtl ? -1 : 1;
  const current = steps[index];

  return (
    <div className="min-h-screen h-[100dvh] bg-background text-foreground flex flex-col relative p-3 sm:p-6">
      {/* Tiny always-visible exit button in the top corner */}
      <Link
        to="/recipes/$id"
        params={{ id }}
        aria-label={t("exit")}
        className="absolute top-5 end-5 z-20 size-10 rounded-full grid place-items-center bg-card/90 backdrop-blur-md border border-border text-ink-soft shadow-md hover:text-terracotta hover:border-terracotta/50 text-lg leading-none"
      >
        ×
      </Link>

      <div className="max-w-[780px] w-full mx-auto flex-1 flex flex-col overflow-hidden floating-surface rounded-[2rem]">
        <header className="pt-5 px-6 pb-2 flex justify-center">
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
        </header>

         <main className="flex-1 flex flex-col justify-center px-7 sm:px-14 text-center overflow-hidden relative">
          <span
            dir="ltr"
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-medium tabular-nums text-ink-soft"
          >
            {index + 1} / {total}
          </span>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction * slideSign * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * slideSign * 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
               className="mb-12 rounded-3xl bg-paper/70 border border-rule/50 px-5 py-8 sm:px-10 sm:py-12 shadow-sm"
            >
              {current.section && (
                <span className="small-caps text-[11px] text-terracotta mb-2 block">
                  {current.section}
                </span>
              )}
              <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4 block">
                {t("step")} {index + 1}
              </span>
               <h2 className="font-serif text-3xl sm:text-5xl leading-[1.15] text-balance">
                <TimedText text={current.text} />
              </h2>
            </motion.div>
          </AnimatePresence>

          <div>
            <CookTimer />
          </div>
        </main>

        <footer className="p-6 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
             className="py-4 rounded-2xl border border-border bg-card/60 text-sm font-medium disabled:opacity-40"
          >
            {t("previous")}
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
               className="py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-medium shadow-lg"
            >
              {t("next_step")}
            </button>
          ) : (
            <Link
              to="/recipes/$id"
              params={{ id }}
               className="py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-medium grid place-items-center shadow-lg"
            >
              {t("finish")}
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
