import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useCookbooks,
  createCookbook,
  type Cookbook,
} from "@/lib/cookbooks-store";
import { useRecipes } from "@/lib/recipes-store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gourmet Notes — Your cookbook shelf" },
      {
        name: "description",
        content:
          "A private shelf of vintage cookbooks. Open one, or start a new volume — cookies, pastas, whatever you're keeping.",
      },
    ],
  }),
  component: ShelfPage,
});

function ShelfPage() {
  const books = useCookbooks();
  const recipes = useRecipes();
  const [creating, setCreating] = useState(false);

  const countFor = (id: string) =>
    recipes.filter((r) => r.cookbook_id === id).length;

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4">
      <header className="text-center max-w-[520px] mx-auto">
        <p className="small-caps text-[11px] text-terracotta">from the library of</p>
        <h1 className="mt-2 font-serif text-[3rem] sm:text-[3.4rem] leading-[0.95] tracking-tight">
          <span className="italic">Gourmet</span>
          <br />
          Notes
        </h1>
        <div className="mx-auto mt-5 flex items-center gap-3 max-w-[240px]">
          <span className="flex-1 h-px bg-rule/60" />
          <span className="text-gold text-lg">❦</span>
          <span className="flex-1 h-px bg-rule/60" />
        </div>
        <p className="mt-5 font-serif italic text-[15px] text-ink-soft leading-relaxed">
          Choose a cookbook from the shelf, or bind a new one.
        </p>
      </header>

      <div className="mt-10 max-w-[720px] mx-auto">
        <BookShelf books={books} countFor={countFor} />

        <div className="mt-10">
          {creating ? (
            <NewBookForm
              onClose={() => setCreating(false)}
              onCreated={() => setCreating(false)}
            />
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mx-auto block small-caps text-[11px] text-terracotta hover:text-ink transition-colors border border-terracotta/40 rounded-full px-5 py-2"
            >
              + bind a new volume
            </button>
          )}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 small-caps text-[11px] text-ink-soft hover:text-terracotta transition-colors"
          >
            ask the cook for ideas →
          </Link>
        </div>
      </div>

      <p className="mt-14 text-center small-caps text-[10px] text-ink-soft/70">
        kept privately on this device
      </p>
    </div>
  );
}

function BookShelf({
  books,
  countFor,
}: {
  books: Cookbook[];
  countFor: (id: string) => number;
}) {
  return (
    <div className="relative">
      {/* wooden shelf plank */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8 items-end pb-4">
        {books.map((b) => (
          <BookOnShelf key={b.id} book={b} count={countFor(b.id)} />
        ))}
      </div>
      <div
        aria-hidden
        className="h-3 rounded-sm shadow-[0_10px_18px_-10px_rgba(43,31,20,0.6)]"
        style={{
          background:
            "linear-gradient(to bottom, #7a5231, #4b2f18 60%, #2e1c0e)",
        }}
      />
      <div
        aria-hidden
        className="h-1 bg-black/30 mx-2 rounded-b-sm"
      />
    </div>
  );
}

function BookOnShelf({ book, count }: { book: Cookbook; count: number }) {
  const cover = `hsl(${book.hue} 40% 32%)`;
  const coverDeep = `hsl(${book.hue} 45% 22%)`;
  const gilt = `hsl(${book.hue} 50% 75%)`;

  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group block relative"
      style={{ perspective: "800px" }}
    >
      <div
        className="relative mx-auto w-full max-w-[190px] aspect-[3/4] rounded-[3px] shadow-[0_18px_28px_-14px_rgba(0,0,0,0.55),0_4px_10px_-4px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]"
        style={{
          background: `linear-gradient(135deg, ${cover}, ${coverDeep})`,
          transformOrigin: "bottom center",
        }}
      >
        {/* spine highlight */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-2 rounded-l-[3px]"
          style={{
            background:
              "linear-gradient(to right, rgba(255,255,255,0.14), rgba(0,0,0,0.35))",
          }}
        />
        {/* pages edge on right */}
        <div
          aria-hidden
          className="absolute inset-y-1 right-0 w-1"
          style={{
            background:
              "repeating-linear-gradient(to bottom, #f1e7ce 0 2px, #d9caa4 2px 3px)",
            borderRadius: "0 2px 2px 0",
          }}
        />
        {/* gilt frame */}
        <div
          className="absolute inset-4 rounded-[2px] flex flex-col items-center justify-center text-center px-2"
          style={{
            border: `1px solid ${gilt}`,
            boxShadow: `inset 0 0 0 3px transparent, inset 0 0 0 4px ${gilt}22`,
          }}
        >
          <span className="text-2xl mb-2 drop-shadow-sm">{book.emoji}</span>
          <p
            className="font-serif italic text-[15px] leading-tight"
            style={{ color: gilt }}
          >
            {book.name}
          </p>
          {book.subtitle && (
            <p
              className="mt-1 small-caps text-[8px]"
              style={{ color: `${gilt}cc` }}
            >
              {book.subtitle}
            </p>
          )}
          <div
            className="mt-3 h-px w-8"
            style={{ background: `${gilt}66` }}
          />
          <p
            className="mt-2 small-caps text-[8px]"
            style={{ color: `${gilt}aa` }}
          >
            {count === 0
              ? "empty"
              : `${count} ${count === 1 ? "entry" : "entries"}`}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center small-caps text-[9px] text-ink-soft">
        open volume
      </p>
    </Link>
  );
}

function NewBookForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCookbook({ name, subtitle });
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-[420px] mx-auto paper-page rounded-[3px] p-5"
    >
      <p className="small-caps text-[10px] text-terracotta text-center">
        bind a new volume
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Title (e.g. Cookies, Pastas)"
        className="mt-3 w-full bg-transparent border-b border-rule/60 py-2 font-serif italic text-lg outline-none focus:border-terracotta"
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="A short subtitle (optional)"
        className="mt-3 w-full bg-transparent border-b border-rule/40 py-2 text-sm outline-none focus:border-terracotta"
      />
      <div className="mt-5 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="small-caps text-[10px] text-ink-soft px-3 py-2"
        >
          cancel
        </button>
        <button
          type="submit"
          className="bg-ink text-paper text-sm px-4 py-2 rounded active:scale-95 transition-transform"
        >
          Bind volume
        </button>
      </div>
    </form>
  );
}

// exported for the book detail page delete flow
export { deleteCookbook };
