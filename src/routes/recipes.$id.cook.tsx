import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRecipe } from "@/lib/recipes-store";
import { CookTimer } from "@/components/CookTimer";

export const Route = createFileRoute("/recipes/$id/cook")({
  ssr: false,
  head: () => ({ meta: [{ title: "Cook Mode — Gourmet Notes" }] }),
  component: CookMode,
});

function CookMode() {
  const { id } = Route.useParams();
  const recipe = useRecipe(id);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  if (!recipe) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-background">
        <div className="text-center">
          <p className="font-serif text-xl">Recipe not found on this device.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            Back to cookbook
          </Link>
        </div>
      </div>
    );
  }

  const steps = recipe.instructions;
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
          <p className="font-serif text-xl">No steps for this recipe.</p>
          <Link
            to="/recipes/$id"
            params={{ id }}
            className="mt-4 inline-block text-sm text-primary underline"
          >
            Back to recipe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[100dvh] bg-background text-foreground flex flex-col">
      <div className="max-w-[440px] w-full mx-auto flex-1 flex flex-col overflow-hidden">
        <header className="p-6 flex justify-between items-center">
          <Link
            to="/recipes/$id"
            params={{ id }}
            className="text-[10px] uppercase tracking-widest font-medium"
          >
            Exit
          </Link>
          <div className="flex gap-1">
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
          <span className="text-[10px] font-medium tabular-nums">
            {index + 1} / {total}
          </span>
        </header>

        <main className="flex-1 flex flex-col justify-center px-8 text-center overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4 block">
                Step {index + 1}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl leading-snug text-balance">
                {steps[index]}
              </h2>
            </motion.div>
          </AnimatePresence>

          <CookTimer />
        </main>

        <footer className="p-6 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="py-4 rounded-xl border border-border text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              className="py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Next Step
            </button>
          ) : (
            <Link
              to="/recipes/$id"
              params={{ id }}
              className="py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium grid place-items-center"
            >
              Finish
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
