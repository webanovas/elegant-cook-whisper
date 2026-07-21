import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { chatWithGemini, type RecipeSuggestion } from "@/lib/chat.functions";
import { useRecipes } from "@/lib/recipes-store";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Ask the Cook — Gourmet Notes" },
      {
        name: "description",
        content:
          "Discuss what to cook with the resident chef. Find recipes you've saved or discover new dishes to try.",
      },
    ],
  }),
  component: ChatPage,
});

type UIMessage = {
  role: "user" | "assistant";
  content: string;
  suggestions?: RecipeSuggestion[];
};

const OPENING: UIMessage = {
  role: "assistant",
  content:
    "Good day. Tell me what you're in the mood for — a quick supper, something from the pantry, a dinner-party centerpiece — and I'll find a recipe from your book or suggest a new dish to try.",
};

function ChatPage() {
  const send = useServerFn(chatWithGemini);
  const [messages, setMessages] = useState<UIMessage[]>([OPENING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextHistory: UIMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const reply = await send({
        data: {
          messages: nextHistory
            .filter((m) => m !== OPENING)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: reply.content,
          suggestions: reply.suggestions,
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[520px] mx-auto px-6 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="small-caps text-[11px] text-ink-soft hover:text-terracotta transition-colors"
          >
            ← Back to cookbook
          </Link>
          <span className="small-caps text-[11px] text-ink-soft">Chapter · ??</span>
        </div>

        <header className="mt-8 text-center">
          <p className="small-caps text-[11px] text-terracotta mb-3">
            a conversation with
          </p>
          <h1 className="font-serif text-[2.75rem] leading-[1.05] italic tracking-tight">
            the Resident Cook
          </h1>
          <div className="ornament-rule mt-4">
            <span className="text-terracotta">✦</span>
          </div>
        </header>
      </div>

      <div className="max-w-[520px] mx-auto px-6">
        <div
          ref={scrollRef}
          className="min-h-[52vh] max-h-[62vh] overflow-y-auto pr-1"
        >
          <div className="space-y-6 py-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {m.role === "assistant" ? (
                    <AssistantBubble
                      content={m.content}
                      suggestions={m.suggestions}
                    />
                  ) : (
                    <UserBubble content={m.content} />
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-destructive italic">{error}</p>
        )}

        <form
          onSubmit={submit}
          className="mt-4 mb-10 bg-card rounded-lg border border-border/70 shadow-[0_10px_30px_-16px_rgba(43,31,20,0.35)]"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="What shall we cook today?"
            className="w-full bg-transparent px-4 pt-3 pb-1 text-[15px] leading-relaxed font-serif italic placeholder:text-ink-soft/60 outline-none resize-none"
            disabled={loading}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="small-caps text-[10px] text-ink-soft/70">
              enter to send · shift + enter for a new line
            </span>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-terracotta text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium tracking-wide transition-transform active:scale-95 disabled:opacity-50"
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  suggestions,
}: {
  content: string;
  suggestions?: RecipeSuggestion[];
}) {
  return (
    <div>
      <p className="small-caps text-[10px] text-terracotta mb-2">the cook</p>
      <div className="font-serif text-[17px] leading-[1.7] text-ink whitespace-pre-wrap">
        {content}
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              to="/recipes/$id"
              params={{ id: s.id }}
              className="group flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border/70 rounded-md hover:border-terracotta/60 transition-colors"
            >
              <span className="font-serif text-[15px] italic">{s.title}</span>
              <span className="small-caps text-[10px] text-ink-soft group-hover:text-terracotta">
                open →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="pl-6 border-l-2 border-terracotta/40">
      <p className="small-caps text-[10px] text-ink-soft mb-1">you</p>
      <p className="text-[15px] leading-relaxed text-ink">{content}</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div>
      <p className="small-caps text-[10px] text-terracotta mb-2">the cook</p>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-terracotta/70"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
