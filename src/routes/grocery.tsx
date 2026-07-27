import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  addGroceryItem,
  clearAllGrocery,
  clearChecked,
  removeGrocery,
  toggleGrocery,
  useGrocery,
} from "@/lib/grocery-store";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/grocery")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Grocery list — MyCookbook" },
      { name: "description", content: "Your running shopping list for tonight's cooking." },
    ],
  }),
  component: GroceryPage,
});

function GroceryPage() {
  const items = useGrocery();
  const t = useT();
  const [draft, setDraft] = useState("");

  const remaining = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    addGroceryItem({ amount: "", unit: "", name, recipe_title: null });
    setDraft("");
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[560px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link
            to="/"
            className="small-caps text-[11px] text-ink-soft hover:text-terracotta"
          >
            ← {t("back_cookbook")}
          </Link>
          <LangToggle />
        </div>

        <header className="text-center">
          <p className="small-caps text-[11px] text-terracotta">{t("grocery_kicker")}</p>
          <h1 className="mt-2 font-serif italic text-[2.4rem] leading-tight">
            {t("grocery_title")}
          </h1>
          <div className="mx-auto mt-4 flex items-center gap-3 max-w-[220px]">
            <span className="flex-1 h-px bg-rule/60" />
            <span className="text-gold">❦</span>
            <span className="flex-1 h-px bg-rule/60" />
          </div>
        </header>

        <form onSubmit={onAdd} className="mt-8 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("grocery_add_ph")}
            className="flex-1 bg-card/60 border border-border/70 rounded px-3 py-2 text-sm font-serif italic outline-none focus:border-terracotta/60 transition-colors"
          />
          <button
            type="submit"
            className="bg-ink text-paper px-4 py-2 rounded text-sm font-medium transition-transform active:scale-95"
          >
            {t("grocery_add")}
          </button>
        </form>

        {items.length === 0 ? (
          <div className="mt-10 text-center py-16 border border-dashed border-rule/60 rounded-md bg-paper-deep/30">
            <p className="font-serif italic text-lg text-ink">{t("grocery_empty")}</p>
            <p className="mt-2 text-sm text-ink-soft">{t("grocery_empty_hint")}</p>
          </div>
        ) : (
          <>
            <section className="mt-10">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="small-caps text-[11px] text-terracotta">
                  {t("grocery_to_buy")}
                </h2>
                <span className="small-caps text-[10px] text-ink-soft">
                  <span dir="ltr">{remaining.length}</span>
                </span>
              </div>
              {remaining.length === 0 ? (
                <p className="text-center py-6 text-sm text-ink-soft italic">
                  {t("grocery_all_done")}
                </p>
              ) : (
                <ul className="divide-y divide-rule/40 border-y border-rule/40">
                  <AnimatePresence initial={false}>
                    {remaining.map((i) => (
                      <motion.li
                        key={i.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <GroceryRow item={i} onToggle={toggleGrocery} onRemove={removeGrocery} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            {done.length > 0 && (
              <section className="mt-10">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="small-caps text-[11px] text-ink-soft">
                    {t("grocery_done")}
                  </h2>
                  <button
                    type="button"
                    onClick={clearChecked}
                    className="small-caps text-[10px] text-ink-soft/70 hover:text-terracotta"
                  >
                    {t("grocery_clear_done")}
                  </button>
                </div>
                <ul className="divide-y divide-rule/40 border-y border-rule/40 opacity-60">
                  {done.map((i) => (
                    <li key={i.id}>
                      <GroceryRow item={i} onToggle={toggleGrocery} onRemove={removeGrocery} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => {
                  if (confirm(t("grocery_confirm_clear"))) clearAllGrocery();
                }}
                className="small-caps text-[10px] text-ink-soft/70 hover:text-destructive"
              >
                {t("grocery_clear_all")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GroceryRow({
  item,
  onToggle,
  onRemove,
}: {
  item: import("@/lib/grocery-store").GroceryItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-label="toggle"
        className={`shrink-0 size-5 rounded border transition-colors grid place-items-center ${
          item.checked
            ? "bg-terracotta border-terracotta text-paper"
            : "border-ink/30 hover:border-terracotta"
        }`}
      >
        {item.checked && <span className="text-[11px] leading-none">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            item.checked ? "line-through text-ink-soft" : "text-ink"
          }`}
        >
          {(item.amount || item.unit) && (
            <span className="font-medium me-2 tabular-nums" dir="ltr">
              {item.amount}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
          )}
          {item.name}
        </p>
        {item.recipe_title && (
          <p className="mt-0.5 small-caps text-[9px] text-ink-soft/70 truncate">
            {item.recipe_title}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={t("delete")}
        className="text-ink-soft/50 hover:text-destructive text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
}
