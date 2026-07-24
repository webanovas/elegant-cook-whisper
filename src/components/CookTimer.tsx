import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CookTimer() {
  const t = useT();
  const [seconds, setSeconds] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function adjust(delta: number) {
    setSeconds((s) => Math.max(0, s + delta));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("timer")}
      </span>
      <div
        dir="ltr"
        className="font-serif text-4xl tracking-tight tabular-nums"
      >
        {format(seconds)}
      </div>
      <div className="flex gap-2" dir="ltr">
        <button
          type="button"
          onClick={() => adjust(-60)}
          className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground border border-border px-2 py-1 rounded"
        >
          −1m
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="text-[10px] font-medium uppercase tracking-widest text-primary border border-primary/30 px-3 py-1 rounded"
        >
          {running ? t("pause") : t("start")}
        </button>
        <button
          type="button"
          onClick={() => adjust(60)}
          className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground border border-border px-2 py-1 rounded"
        >
          +1m
        </button>
      </div>
    </div>
  );
}
