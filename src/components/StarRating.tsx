import { useState } from "react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className = "",
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const sizeCls =
    size === "sm" ? "text-[13px]" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        const common = `${sizeCls} leading-none transition-colors ${
          filled ? "text-terracotta" : "text-ink/25"
        }`;
        if (readOnly || !onChange) {
          return (
            <span key={n} aria-hidden className={common}>
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(value === n ? 0 : n);
            }}
            onMouseEnter={() => setHover(n)}
            className={`${common} p-0.5 hover:scale-110 transition-transform cursor-pointer`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
