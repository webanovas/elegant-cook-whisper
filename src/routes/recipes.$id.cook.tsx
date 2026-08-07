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
    <div className="min-h-screen h-[100dvh] bg-background text-foreground flex flex-col relative">
      {/* Tiny always-visible exit button in the top corner */}
      <Link
        to="/recipes/$id"
        params={{ id }}
        aria-label={t("exit")}
        className="absolute top-3 end-3 z-20 size-9 rounded-full grid place-items-center bg-background/70 backdrop-blur-md border border-border/60 text-ink-soft hover:text-terracotta hover:border-terracotta/50 transition-colors text-lg leading-none"
      >
        ×
      </Link>

      <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col overflow-hidden">
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

        <main className="flex-1 flex flex-col justify-center px-8 text-center overflow-hidden relative">
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
