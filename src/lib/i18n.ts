import { useSyncExternalStore } from "react";

export type Lang = "en" | "he";

const KEY = "gourmet-notes:lang";
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Lang {
  if (!isBrowser()) return "en";
  const v = window.localStorage.getItem(KEY);
  return v === "he" ? "he" : "en";
}

function applyDir(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = l === "he" ? "rtl" : "ltr";
}

let cache: Lang = "en";
let initialized = false;

function refresh() {
  cache = read();
  initialized = true;
  applyDir(cache);
}

if (isBrowser()) {
  // Apply on module load so the shell reflects the saved language immediately.
  refresh();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      refresh();
      listeners.forEach((l) => l());
    }
  });
}

export function setLang(l: Lang) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, l);
  cache = l;
  applyDir(l);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function snapshot(): Lang {
  if (!initialized) refresh();
  return cache;
}

function serverSnapshot(): Lang {
  return "en";
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

type Dict = Record<string, string>;

const en: Dict = {
  // shelf
  from_library: "from the library of",
  choose_or_bind: "Choose a cookbook from the shelf, or bind a new one.",
  bind_new_volume: "+ bind a new volume",
  ask_the_cook: "ask the cook for ideas →",
  kept_privately: "kept privately on this device",
  new_volume: "bind a new volume",
  title_ph: "Title (e.g. Cookies, Pastas)",
  subtitle_ph: "A short subtitle (optional)",
  cancel: "cancel",
  bind: "Bind volume",
  open_volume: "open volume",
  empty: "empty",
  entry: "entry",
  entries: "entries",
  // search
  search_all: "search all recipes",
  dish_type: "dish type",
  all_types: "all types",
  prep_length: "prep length",
  any_length: "any length",
  under_15: "under 15 min",
  bucket_15_30: "15 – 30 min",
  bucket_30_60: "30 – 60 min",
  over_1h: "over 1 hour",
  min_stars: "min stars",
  any: "any",
  sort_by: "sort by",
  sort_top: "top rated",
  sort_quick: "quickest first",
  sort_newest: "most recent",
  sort_az: "a → z",
  nothing_matches: "nothing matches",
  of_total: "of",
  pick_for_me: "✦ pick one for me",
  reset: "reset",
  tonight: "tonight:",
  search_ph: "Search by name, tag, description…",
  no_match_short: "no recipes match these filters",
  // library new
  your_library: "Your Library",
  gourmet_notes: "Gourmet Notes",
  recipe_word: "recipe",
  recipes_word: "recipes",
  tier_empty: "your library is waiting for its first page",
  tier_seedling: "a young library, promising",
  tier_growing: "a proper little collection",
  tier_flourishing: "a flourishing kitchen library",
  tier_abundant: "an abundant, well-loved cookbook",
  tier_legendary: "a legendary personal library ✦",
  add_new_recipe: "+ add a new recipe",
  quickness: "quickness",
  rating_label: "rating",
  quickness_any: "any speed",
  quickness_15: "up to 15 min",
  quickness_30: "up to 30 min",
  quickness_45: "up to 45 min",
  quickness_60: "up to 1 hour",
  quickness_90: "up to 1½ hours",
  rating_any: "any rating",
  rating_min: "at least {n}★",
  reset_all: "reset all",
  ask_narrow: "✦ ask the cook to narrow it down",
  ask_placeholder_vibe: "cozy rainy night · impress my parents",
  match_btn: "match",
  thinking: "thinking…",
  clear: "clear",
  first_page_lib: "The first page of your library.",
  clip_hint_lib: "Clip a recipe above to begin.",
  filters_active_q: "Should I stick to the filters you set, or ignore them?",
  keep_filters: "keep filters",
  ignore_filters: "ignore filters",
  vibe_no_match: "The cook couldn't match that mood — try different words.",
  reshuffle: "↻ reshuffle",

  // book page
  back_shelf: "← the shelf",
  discard_volume: "discard volume",
  volume: "volume",
  from_shelf: "from the shelf of Gourmet Notes",
  contents: "Contents",
  no_entries: "no entries",
  blank_pages: "The pages are blank.",
  clip_hint: "Clip a recipe above to begin this volume.",
  clip_recipe: "clip a recipe",
  from_url: "from a URL",
  search_web: "search the web",
  paste_url_ph: "Paste any recipe URL…",
  clip: "Clip",
  reading: "Reading…",
  search_ph_web: "e.g. Neapolitan pizza dough",
  search_ph_web_short: "e.g. pizza dough",

  search: "Search",
  searching: "Searching…",
  no_web_results: "No recipes found. Try a different search.",
  clipping: "clipping…",
  clip_arrow: "clip →",
  auto_sort: "let the cook sort it for me",
  transcribing: "Transcribing to a fresh page & plating a picture…",
  confirm_delete_book: "Remove this volume and everything in it? This can't be undone.",
  // recipe detail
  recipe_not_found: "Recipe not found",
  not_on_device: "It may have been removed from this device.",
  back_cookbook: "Back to cookbook",
  your_rating: "your rating",
  prep: "Prep",
  cook: "Cook",
  serves: "Serves",
  ingredients: "Ingredients",
  no_ingredients: "No ingredients listed.",
  method: "Method",
  original_source: "Original source",
  delete: "Delete",
  confirm_delete_recipe: "Delete this recipe from this device?",
  start_cook: "Start Cook Mode",
  sub: "Sub",
  substitute_loading: "Thinking of alternatives…",
  close: "Close",
  // cook mode
  cook_not_found: "Recipe not found on this device.",
  no_steps: "No steps for this recipe.",
  back_recipe: "Back to recipe",
  exit: "Exit",
  step: "Step",
  previous: "Previous",
  next_step: "Next Step",
  finish: "Finish",
  tap_show: "tap to show controls",
  timer: "Timer",
  start: "Start",
  pause: "Pause",
  // chat
  back_cookbook_short: "← Back to cookbook",
  a_conversation_with: "a conversation with",
  the_cook: "the Resident Cook",
  ask_placeholder: "What shall we cook today?",
  enter_hint: "enter to send · shift + enter for a new line",
  ask: "Ask",
  you: "you",
  cook_label: "the cook",
  open_arrow: "open →",
  opening_message: "Good day. Tell me what you're in the mood for — a quick supper, something from the pantry, a dinner-party centerpiece — and I'll find a recipe from your book or suggest a new dish to try.",
  with_filters_note: "(sticking to your filters: {summary})",
  ignoring_filters_note: "(setting your filters aside)",

  // language
  lang_toggle_to_he: "עברית",
  lang_toggle_to_en: "English",
  // errors
  something_burned: "Something burned in the oven",
  try_again: "Try again",
  page_slipped: "This page slipped out of the cookbook.",
  back_kitchen: "Back to kitchen",
  // misc
  unrated: "unrated",
  plate: "plate",
  a_plate: "a plate from the kitchen",
};

const he: Dict = {
  from_library: "מהספרייה של",
  choose_or_bind: "בחר ספר בישול מהמדף, או כרוך אחד חדש.",
  bind_new_volume: "+ כרוך כרך חדש",
  ask_the_cook: "התייעץ עם השף לרעיונות →",
  kept_privately: "נשמר באופן פרטי במכשיר הזה",
  new_volume: "כרוך כרך חדש",
  title_ph: "שם (למשל: עוגיות, פסטות)",
  subtitle_ph: "כותרת משנה קצרה (רשות)",
  cancel: "ביטול",
  bind: "כרוך כרך",
  open_volume: "פתח כרך",
  empty: "ריק",
  entry: "מתכון",
  entries: "מתכונים",

  search_all: "חיפוש בכל המתכונים",
  dish_type: "סוג מנה",
  all_types: "כל הסוגים",
  prep_length: "זמן הכנה",
  any_length: "כל אורך",
  under_15: "עד 15 דקות",
  bucket_15_30: "15 – 30 דקות",
  bucket_30_60: "30 – 60 דקות",
  over_1h: "מעל שעה",
  min_stars: "מינימום כוכבים",
  any: "הכל",
  sort_by: "מיין לפי",
  sort_top: "דירוג גבוה",
  sort_quick: "המהיר ביותר",
  sort_newest: "החדש ביותר",
  sort_az: "א → ת",
  nothing_matches: "אין תוצאות",
  of_total: "מתוך",
  pick_for_me: "✦ בחר בשבילי",
  reset: "איפוס",
  tonight: "הערב:",
  search_ph: "חפש לפי שם, תגית או תיאור…",
  no_match_short: "אין מתכונים שתואמים לפילטרים",

  your_library: "הספרייה שלך",
  gourmet_notes: "Gourmet Notes",
  recipe_word: "מתכון",
  recipes_word: "מתכונים",
  tier_empty: "הספרייה שלך מחכה לדף הראשון",
  tier_seedling: "ספרייה צעירה, מבטיחה",
  tier_growing: "אוסף קטן וראוי",
  tier_flourishing: "ספרייה משגשגת של המטבח",
  tier_abundant: "ספר בישול שופע ואהוב",
  tier_legendary: "ספרייה אישית אגדית ✦",
  add_new_recipe: "+ הוסף מתכון חדש",
  quickness: "מהירות",
  rating_label: "דירוג",
  quickness_any: "כל מהירות",
  quickness_15: "עד 15 דקות",
  quickness_30: "עד 30 דקות",
  quickness_45: "עד 45 דקות",
  quickness_60: "עד שעה",
  quickness_90: "עד שעה וחצי",
  rating_any: "כל דירוג",
  rating_min: "לפחות {n}★",
  reset_all: "אפס הכל",
  ask_narrow: "✦ תשאל את השף לסנן",
  ask_placeholder_vibe: "ערב גשום ונעים · להרשים את ההורים",
  match_btn: "מצא",
  thinking: "חושב…",
  clear: "נקה",
  first_page_lib: "הדף הראשון של הספרייה שלך.",
  clip_hint_lib: "הוסף מתכון למעלה כדי להתחיל.",
  filters_active_q: "להישאר עם הפילטרים שבחרת, או להתעלם מהם?",
  keep_filters: "עם הפילטרים",
  ignore_filters: "בלי פילטרים",
  vibe_no_match: "השף לא הצליח להתאים למצב הזה — נסה מילים אחרות.",
  reshuffle: "↻ ערבב מחדש",


  back_shelf: "← המדף",
  discard_volume: "מחק כרך",
  volume: "כרך",
  from_shelf: "מהמדף של Gourmet Notes",
  contents: "תוכן העניינים",
  no_entries: "אין מתכונים",
  blank_pages: "הדפים ריקים.",
  clip_hint: "הוסף מתכון למעלה כדי להתחיל את הכרך.",
  clip_recipe: "הוסף מתכון",
  from_url: "מכתובת URL",
  search_web: "חפש ברשת",
  paste_url_ph: "הדבק כתובת של מתכון…",
  clip: "הוסף",
  reading: "קורא…",
  search_ph_web: "למשל: פיצה נפוליטנית",
  search: "חפש",
  searching: "מחפש…",
  no_web_results: "לא נמצאו מתכונים. נסה חיפוש אחר.",
  clipping: "מוסיף…",
  clip_arrow: "הוסף ←",
  auto_sort: "תן לשף למיין בשבילי",
  transcribing: "מעתיק לדף חדש ומצלם צלחת…",
  confirm_delete_book: "למחוק את הכרך ואת כל מה שבתוכו? לא ניתן לבטל.",

  recipe_not_found: "המתכון לא נמצא",
  not_on_device: "ייתכן שהוסר מהמכשיר הזה.",
  back_cookbook: "חזור לספר המתכונים",
  your_rating: "הדירוג שלך",
  prep: "הכנה",
  cook: "בישול",
  serves: "מנות",
  ingredients: "מרכיבים",
  no_ingredients: "לא צוינו מרכיבים.",
  method: "הוראות הכנה",
  original_source: "מקור מקורי",
  delete: "מחק",
  confirm_delete_recipe: "למחוק את המתכון הזה מהמכשיר?",
  start_cook: "התחל מצב בישול",
  sub: "תחליף",
  substitute_loading: "חושב על חלופות…",
  close: "סגור",

  cook_not_found: "המתכון לא נמצא במכשיר.",
  no_steps: "אין שלבים למתכון הזה.",
  back_recipe: "חזור למתכון",
  exit: "יציאה",
  step: "שלב",
  previous: "הקודם",
  next_step: "השלב הבא",
  finish: "סיום",
  tap_show: "הקש להצגת הכפתורים",
  timer: "טיימר",
  start: "התחל",
  pause: "השהה",

  back_cookbook_short: "← חזרה לספר המתכונים",
  a_conversation_with: "שיחה עם",
  the_cook: "השף הביתי",
  ask_placeholder: "מה נבשל היום?",
  enter_hint: "Enter לשליחה · Shift+Enter לשורה חדשה",
  ask: "שאל",
  you: "אתה",
  cook_label: "השף",
  open_arrow: "פתח ←",
  opening_message: "יום טוב. ספר לי מה בא לך — ארוחה מהירה, משהו מהמזווה, מנת מרכז לאירוח — ואני אמצא מתכון מהספר שלך או אציע מנה חדשה לנסות.",
  with_filters_note: "(נשאר עם הפילטרים שלך: {summary})",
  ignoring_filters_note: "(מתעלם מהפילטרים)",


  lang_toggle_to_he: "עברית",
  lang_toggle_to_en: "English",

  something_burned: "משהו נשרף בתנור",
  try_again: "נסה שוב",
  page_slipped: "הדף הזה נשמט מהספר.",
  back_kitchen: "חזרה למטבח",

  unrated: "לא דורג",
  plate: "צלחת",
  a_plate: "צלחת מהמטבח",
};

export function useT() {
  const lang = useLang();
  const dict = lang === "he" ? he : en;
  return (k: string, fallback?: string) => dict[k] ?? fallback ?? en[k] ?? k;
}
