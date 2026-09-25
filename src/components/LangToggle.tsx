import { setLang, useLang } from "@/lib/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const next = lang === "he" ? "en" : "he";
  const label = lang === "he" ? "English" : "עברית";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className={`text-xs font-medium text-ink-soft hover:text-terracotta transition-all border border-rule/60 bg-card/70 shadow-sm rounded-full px-3.5 py-2 active:scale-[0.98] ${className}`}
      aria-label={`Switch language to ${label}`}
    >
      {label}
    </button>
  );
}
