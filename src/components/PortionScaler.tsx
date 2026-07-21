import { motion, AnimatePresence } from "framer-motion";

export function PortionScaler({
  servings,
  onChange,
}: {
  servings: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-secondary rounded-full px-3 py-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, servings - 1))}
        className="text-lg leading-none hover:text-primary transition-colors w-5"
        aria-label="Fewer servings"
      >
        −
      </button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={servings}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="text-sm font-medium w-4 text-center tabular-nums"
        >
          {servings}
        </motion.span>
      </AnimatePresence>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, servings + 1))}
        className="text-lg leading-none hover:text-primary transition-colors w-5"
        aria-label="More servings"
      >
        +
      </button>
    </div>
  );
}
