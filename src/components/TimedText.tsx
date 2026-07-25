import { useEffect, useRef, useState } from "react";
import { parseTimeTokens } from "@/lib/parse-time";
import { useT } from "@/lib/i18n";

function format(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Renders instruction text; wraps any duration phrase ("5 min", "חצי שעה",
 * "1-2 hours") in a tappable chip that spawns an inline countdown.
 */
export function TimedText({ text }: { text: string }) {
  const tokens = parseTimeTokens(text);
  return (
    <>
      {tokens.map((tok, i) =>
        tok.type === "text" ? (
          <span key={i}>{tok.text}</span>
        ) : (
          <TimeChip key={i} label={tok.text} seconds={tok.seconds} />
        ),
      )}
    </>
  );
}

function TimeChip({ label, seconds }: { label: string; seconds: number }) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setDone(true);
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {
            /* noop */
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActive(true);
          setRunning(true);
        }}
        className="inline-flex items-baseline gap-1 px-1.5 py-[1px] mx-[1px] rounded font-medium text-terracotta bg-terracotta/10 hover:bg-terracotta/20 border border-terracotta/30 border-dashed transition-colors align-baseline whitespace-nowrap"
        title={t("start_timer_title") ?? "Start timer"}
      >
        <span aria-hidden className="text-[10px] leading-none opacity-70">⏱</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      dir="ltr"
      className={
        "inline-flex items-center gap-1.5 px-2 py-[2px] mx-[1px] rounded border align-baseline whitespace-nowrap font-medium tabular-nums transition-colors " +
        (done
          ? "bg-gold/25 border-gold text-ink"
          : "bg-terracotta/15 border-terracotta text-terracotta")
      }
    >
      <span className="text-[11px] tabular-nums">{format(remaining)}</span>
      <button
        type="button"
        onClick={() => {
          if (done) {
            setRemaining(seconds);
            setDone(false);
            setRunning(true);
          } else {
            setRunning((r) => !r);
          }
        }}
        className="text-[9px] uppercase tracking-widest opacity-80 hover:opacity-100"
      >
        {done ? t("timer_restart") : running ? t("pause") : t("start")}
      </button>
      <button
        type="button"
        onClick={() => {
          setActive(false);
          setRunning(false);
          setRemaining(seconds);
          setDone(false);
        }}
        aria-label={t("close")}
        className="text-[10px] leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
}
