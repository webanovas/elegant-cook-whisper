// Detects durations mentioned inside instruction text so we can render them
// as tappable timer chips. Works for both English and Hebrew phrasings and
// handles ranges like "5-7 minutes" (uses the upper bound so the user has
// enough time).

export type TimeToken =
  | { type: "text"; text: string }
  | { type: "time"; text: string; seconds: number };

interface Unit {
  seconds: number;
  // Regex fragment matching the unit word (no capture groups).
  pattern: string;
}

const UNITS: Unit[] = [
  // Hebrew — hours
  { seconds: 3600, pattern: "שעות|שעה" },
  // Hebrew — minutes
  { seconds: 60, pattern: "דקות|דקה|דק['׳']?" },
  // Hebrew — seconds
  { seconds: 1, pattern: "שניות|שנייה|שניה" },
  // English — hours
  { seconds: 3600, pattern: "hours?|hrs?|h" },
  // English — minutes
  { seconds: 60, pattern: "minutes?|mins?|min|m" },
  // English — seconds
  { seconds: 1, pattern: "seconds?|secs?|sec|s" },
];

// Build one big regex: number (optionally range) + optional space + unit word.
// We assemble by unit so we can attach the multiplier without another lookup.
function buildRegex(): RegExp {
  const num = "\\d+(?:[.,]\\d+)?";
  const range = `${num}(?:\\s*[–\\-]\\s*${num})?`;
  // Use Unicode-aware boundaries so Hebrew words (which aren't ASCII \w) still
  // anchor cleanly: \b treats Hebrew letters as non-word, so "5 דקות" never
  // matched. Lookbehind guards against matching inside "5g5min"-like tokens.
  const parts = UNITS.map(
    (u) => `(?<![\\p{L}\\p{N}])(?:${range})\\s*(?:${u.pattern})(?![\\p{L}])`,
  );
  return new RegExp(parts.join("|"), "giu");
}

const REGEX = buildRegex();

function parseMatch(raw: string): number | null {
  // Grab last number in the match (handles ranges like "5-7 min" → 7).
  const nums = raw.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const n = parseFloat(nums[nums.length - 1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;

  // Figure out which unit matched by checking the tail of the string.
  const tail = raw.toLowerCase();
  for (const u of UNITS) {
    if (new RegExp(`(?:${u.pattern})\\s*$`, "iu").test(tail)) {
      return Math.round(n * u.seconds);
    }
  }
  return null;
}

export function parseTimeTokens(text: string): TimeToken[] {
  if (!text) return [{ type: "text", text: "" }];
  const out: TimeToken[] = [];
  let last = 0;
  // Reset regex state — /g regexes carry lastIndex across calls.
  REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REGEX.exec(text)) !== null) {
    const seconds = parseMatch(m[0]);
    // Reject anything <10s (usually not a cook timer, e.g. "1 s" oddities)
    // and >6h (probably slow-cook narrative, we still allow up to 6h).
    if (seconds === null || seconds < 10 || seconds > 6 * 3600) continue;

    if (m.index > last) {
      out.push({ type: "text", text: text.slice(last, m.index) });
    }
    out.push({ type: "time", text: m[0], seconds });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ type: "text", text: text.slice(last) });
  }
  if (out.length === 0) out.push({ type: "text", text });
  return out;
}
