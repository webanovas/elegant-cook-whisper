import { setLang, useLang } from "@/lib/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const next = lang === "he" ? "en" : "he";
  const label = lang === "he" ? "English" : "עברית";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className={`small-caps text-[10px] text-ink-soft hover:text-terracotta transition-colors border border-rule/50 rounded-full px-3 py-1 ${className}`}
      aria-label={`Switch language to ${label}`}
    >
      {label}
    </button>
  );
}
