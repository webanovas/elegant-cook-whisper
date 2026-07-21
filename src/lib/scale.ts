// Fraction-aware ingredient amount scaling.

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function parseAmount(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  // Unicode fraction alone
  if (UNICODE_FRACTIONS[s]) return UNICODE_FRACTIONS[s];
  // "1 ½" mixed number
  const mixed = s.match(/^(\d+)\s+([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixed) return Number(mixed[1]) + UNICODE_FRACTIONS[mixed[2]];
  // "1/2" or "1 1/2"
  const asciiMixed = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (asciiMixed) {
    const whole = asciiMixed[1] ? Number(asciiMixed[1]) : 0;
    return whole + Number(asciiMixed[2]) / Number(asciiMixed[3]);
  }
  // range like "1-2": use average
  const range = s.match(/^(\d*\.?\d+)\s*[-–]\s*(\d*\.?\d+)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function formatAmount(n: number): string {
  if (n === 0) return "0";
  const rounded = Math.round(n * 100) / 100;
  // Nice integer
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) return String(Math.round(rounded));
  // Common fractions
  const fractions: Array<[number, string]> = [
    [0.25, "¼"],
    [0.33, "⅓"],
    [0.5, "½"],
    [0.67, "⅔"],
    [0.75, "¾"],
  ];
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const match = fractions.find(([v]) => Math.abs(frac - v) < 0.04);
  if (match) return whole > 0 ? `${whole} ${match[1]}` : match[1];
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function scaleAmount(
  original: string,
  fromServings: number,
  toServings: number,
): string {
  if (!original || fromServings <= 0) return original;
  const parsed = parseAmount(original);
  if (parsed == null) return original;
  const scaled = (parsed * toServings) / fromServings;
  return formatAmount(scaled);
}
