import type { Recipe } from "./recipes-store";

export interface Achievement {
  id: string;
  glyph: string;
  /** i18n key for the badge name */
  nameKey: string;
  /** i18n key for the description; may contain {n} */
  descKey: string;
  goal: number;
  progress: number;
  unlocked: boolean;
}

/** Case-insensitive keyword hit across a recipe's searchable text. */
function haystack(r: Recipe): string {
  return [
    r.title,
    r.description ?? "",
    (r.tags ?? []).join(" "),
    (r.ingredients ?? []).map((i) => i.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function has(r: Recipe, words: string[]): boolean {
  const hay = haystack(r);
  return words.some((w) => hay.includes(w.toLowerCase()));
}

const MEAT = [
  "beef", "steak", "chicken", "pork", "lamb", "veal", "bacon", "brisket",
  "meatball", "burger", "sausage", "turkey", "duck", "ribs", "mince", "ground meat",
  "בשר", "סטייק", "עוף", "כבש", "הודו", "נקניק", "המבורגר", "קציצ", "אנטריקוט", "צלעות", "בקר",
];
const FISH = [
  "fish", "salmon", "tuna", "shrimp", "prawn", "cod", "seafood", "calamari", "mussel",
  "דג", "סלמון", "טונה", "שרימפ", "פירות ים", "קלמארי",
];
const VEG = [
  "vegan", "vegetarian", "plant-based", "tofu", "lentil", "chickpea",
  "טבעוני", "צמחוני", "טופו", "עדשים", "חומוס", "קטניות",
];
const SWEET = [
  "dessert", "cake", "cookie", "brownie", "chocolate", "ice cream", "pie", "tart",
  "pudding", "sweet", "caramel",
  "קינוח", "עוגה", "עוגיות", "שוקולד", "גלידה", "מתוק", "פאי", "קרמל", "בראוני",
];
const BAKE = [
  "bake", "baked", "bread", "dough", "pastry", "sourdough", "bun", "croissant", "muffin",
  "אפייה", "אפוי", "לחם", "בצק", "מאפה", "מחמצת", "לחמניה", "מאפינס",
];
const PASTA = [
  "pasta", "spaghetti", "lasagna", "noodle", "ravioli", "risotto", "gnocchi", "penne",
  "פסטה", "ספגטי", "לזניה", "נודלס", "ריזוטו", "רביולי", "אטריות",
];
const SPICY = [
  "spicy", "chili", "chilli", "jalape", "sriracha", "harissa", "hot sauce", "cayenne",
  "חריף", "צ׳ילי", "צילי", "הריסה", "פלפל חריף", "שטה",
];
const SOUP = [
  "soup", "stew", "broth", "chowder", "מרק", "נזיד", "ציר",
];
const BREAKFAST = [
  "breakfast", "brunch", "omelette", "omelet", "pancake", "shakshuka", "granola", "egg",
  "ארוחת בוקר", "חביתה", "פנקייק", "שקשוקה", "גרנולה", "ביצ",
];

const CUISINES: Array<{ id: string; words: string[] }> = [
  { id: "italian", words: ["italian", "איטלק"] },
  { id: "asian", words: ["asian", "thai", "chinese", "japanese", "korean", "אסיאת", "תאילנד", "סיני", "יפני", "קוריאני"] },
  { id: "mexican", words: ["mexican", "taco", "burrito", "מקסיק", "טאקו"] },
  { id: "french", words: ["french", "צרפת"] },
  { id: "indian", words: ["indian", "curry", "masala", "הודי", "קארי"] },
  { id: "middle_eastern", words: ["middle eastern", "levant", "hummus", "falafel", "shawarma", "מזרח תיכון", "חומוס", "פלאפל", "שווארמה"] },
  { id: "greek", words: ["greek", "יווני"] },
  { id: "american", words: ["american", "bbq", "אמריק"] },
];

function minutes(s: string | null | undefined): number | null {
  if (!s) return null;
  const lower = s.toLowerCase();
  let total = 0;
  const h = lower.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours|שעה|שעות|ש׳)/);
  if (h) total += parseFloat(h[1]) * 60;
  const m = lower.match(/(\d+)\s*(m|min|mins|minute|minutes|דק|דקות|ד׳)/);
  if (m) total += parseInt(m[1], 10);
  if (total === 0) {
    const n = lower.match(/(\d+)/);
    if (n) total = parseInt(n[1], 10);
  }
  return total > 0 ? total : null;
}

function totalMinutes(r: Recipe): number | null {
  const p = minutes(r.prep_time);
  const c = minutes(r.cook_time);
  if (p === null && c === null) return null;
  return (p ?? 0) + (c ?? 0);
}

export function computeAchievements(recipes: Recipe[]): Achievement[] {
  const count = (pred: (r: Recipe) => boolean) => recipes.filter(pred).length;

  const cuisines = new Set<string>();
  recipes.forEach((r) => {
    CUISINES.forEach((c) => {
      if (has(r, c.words)) cuisines.add(c.id);
    });
  });

  const defs: Array<Omit<Achievement, "unlocked">> = [
    {
      id: "first_page",
      glyph: "❦",
      nameKey: "ach_first_page",
      descKey: "ach_first_page_d",
      goal: 1,
      progress: recipes.length,
    },
    {
      id: "collector",
      glyph: "📚",
      nameKey: "ach_collector",
      descKey: "ach_collector_d",
      goal: 10,
      progress: recipes.length,
    },
    {
      id: "curator",
      glyph: "🗝",
      nameKey: "ach_curator",
      descKey: "ach_curator_d",
      goal: 25,
      progress: recipes.length,
    },
    {
      id: "archivist",
      glyph: "🏛",
      nameKey: "ach_archivist",
      descKey: "ach_archivist_d",
      goal: 50,
      progress: recipes.length,
    },
    {
      id: "legend",
      glyph: "✦",
      nameKey: "ach_legend",
      descKey: "ach_legend_d",
      goal: 100,
      progress: recipes.length,
    },
    {
      id: "meatlover",
      glyph: "🥩",
      nameKey: "ach_meatlover",
      descKey: "ach_meatlover_d",
      goal: 10,
      progress: count((r) => has(r, MEAT)),
    },
    {
      id: "grill_master",
      glyph: "🔥",
      nameKey: "ach_grill_master",
      descKey: "ach_grill_master_d",
      goal: 20,
      progress: count((r) => has(r, MEAT)),
    },
    {
      id: "garden",
      glyph: "🌿",
      nameKey: "ach_garden",
      descKey: "ach_garden_d",
      goal: 8,
      progress: count((r) => has(r, VEG)),
    },
    {
      id: "catch",
      glyph: "🐟",
      nameKey: "ach_catch",
      descKey: "ach_catch_d",
      goal: 6,
      progress: count((r) => has(r, FISH)),
    },
    {
      id: "sweet_tooth",
      glyph: "🍰",
      nameKey: "ach_sweet_tooth",
      descKey: "ach_sweet_tooth_d",
      goal: 10,
      progress: count((r) => has(r, SWEET)),
    },
    {
      id: "baker",
      glyph: "🥖",
      nameKey: "ach_baker",
      descKey: "ach_baker_d",
      goal: 8,
      progress: count((r) => has(r, BAKE)),
    },
    {
      id: "pasta_maker",
      glyph: "🍝",
      nameKey: "ach_pasta_maker",
      descKey: "ach_pasta_maker_d",
      goal: 8,
      progress: count((r) => has(r, PASTA)),
    },
    {
      id: "fire_eater",
      glyph: "🌶",
      nameKey: "ach_fire_eater",
      descKey: "ach_fire_eater_d",
      goal: 5,
      progress: count((r) => has(r, SPICY)),
    },
    {
      id: "soup_season",
      glyph: "🍲",
      nameKey: "ach_soup_season",
      descKey: "ach_soup_season_d",
      goal: 6,
      progress: count((r) => has(r, SOUP)),
    },
    {
      id: "early_riser",
      glyph: "🍳",
      nameKey: "ach_early_riser",
      descKey: "ach_early_riser_d",
      goal: 6,
      progress: count((r) => has(r, BREAKFAST)),
    },
    {
      id: "quick_hands",
      glyph: "⚡",
      nameKey: "ach_quick_hands",
      descKey: "ach_quick_hands_d",
      goal: 10,
      progress: count((r) => {
        const m = totalMinutes(r);
        return m !== null && m <= 20;
      }),
    },
    {
      id: "slow_cook",
      glyph: "🕰",
      nameKey: "ach_slow_cook",
      descKey: "ach_slow_cook_d",
      goal: 5,
      progress: count((r) => {
        const m = totalMinutes(r);
        return m !== null && m >= 90;
      }),
    },
    {
      id: "critic",
      glyph: "★",
      nameKey: "ach_critic",
      descKey: "ach_critic_d",
      goal: 10,
      progress: count((r) => (r.rating ?? 0) > 0),
    },
    {
      id: "perfectionist",
      glyph: "✧",
      nameKey: "ach_perfectionist",
      descKey: "ach_perfectionist_d",
      goal: 5,
      progress: count((r) => (r.rating ?? 0) === 5),
    },
    {
      id: "annotator",
      glyph: "✎",
      nameKey: "ach_annotator",
      descKey: "ach_annotator_d",
      goal: 5,
      progress: count(
        (r) =>
          !!r.personal_note ||
          !!r.step_notes ||
          !!r.ingredient_notes ||
          !!r.step_overrides ||
          !!r.ingredient_overrides,
      ),
    },
    {
      id: "chef_student",
      glyph: "👨‍🍳",
      nameKey: "ach_chef_student",
      descKey: "ach_chef_student_d",
      goal: 3,
      progress: count((r) => (r.chef_consultations ?? []).length > 0),
    },
    {
      id: "world_tour",
      glyph: "🌍",
      nameKey: "ach_world_tour",
      descKey: "ach_world_tour_d",
      goal: 5,
      progress: cuisines.size,
    },
  ];

  return defs
    .map((d) => ({
      ...d,
      progress: Math.min(d.progress, d.goal),
      unlocked: d.progress >= d.goal,
    }))
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progress / b.goal - a.progress / a.goal;
    });
}
