import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { saveRecipe } from "@/lib/recipes-store";
import { createRecipeCoverDataUrl } from "@/lib/recipe-images";
import { refreshRecipeHeroImage } from "@/lib/recipe-hero";
import { scanRecipeFromImages } from "@/lib/recipes.functions";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/recipes/scan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scan a recipe — Gourmet Notes" },
      { name: "description", content: "Snap a photo of a recipe and let the cook transcribe it." },
    ],
  }),
  component: ScanRecipePage,
});

const MAX_FILES = 4;
const MAX_DIMENSION = 1600;

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  // Downscale to keep the request small.
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = rawUrl;
    });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return rawUrl;
  }
}

function ScanRecipePage() {
  const router = useRouter();
  const t = useT();
  const scan = useServerFn(scanRecipeFromImages);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const next = [...images];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_FILES) break;
      if (!f.type.startsWith("image/")) continue;
      const url = await fileToOptimizedDataUrl(f);
      next.push(url);
    }
    setImages(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onScan() {
    if (images.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await scan({ data: { images } });
      const saved = saveRecipe({
        title: result.title,
        description: result.description,
        prep_time: result.prep_time,
        cook_time: result.cook_time,
        servings: result.servings,
        ingredients: result.ingredients,
        instructions: result.instructions,
        ingredient_sections: result.ingredient_sections,
        instruction_sections: result.instruction_sections,
        tags: result.tags,
        image_url: createRecipeCoverDataUrl({
          title: result.title,
          tags: result.tags,
          description: result.description,
        }),
        image_prompt: result.image_prompt,
        source_url: null,
      });
      refreshRecipeHeroImage(saved).catch((e) =>
        console.error("scan hero image gen failed", e),
      );
      // Stash a scan warning on session storage so the recipe page can show it once.
      if (result.confidence < 0.75 || result.warnings.length > 0) {
        try {
          window.sessionStorage.setItem(
            `gn:scan-notice:${saved.id}`,
            JSON.stringify({
              confidence: result.confidence,
              warnings: result.warnings,
            }),
          );
        } catch {
          /* ignore */
        }
      }
      router.navigate({ to: "/recipes/$id", params: { id: saved.id } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[560px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="small-caps text-[11px] text-ink-soft hover:text-terracotta">
            ← {t("back_cookbook")}
          </Link>
          <LangToggle />
        </div>

        <header className="text-center">
          <p className="small-caps text-[11px] text-terracotta">{t("scan_kicker")}</p>
          <h1 className="mt-2 font-serif italic text-[2.4rem] leading-tight">
            {t("scan_title")}
          </h1>
          <p className="mt-3 text-sm text-ink-soft italic max-w-[400px] mx-auto">
            {t("scan_help")}
          </p>
          <div className="mx-auto mt-4 flex items-center gap-3 max-w-[220px]">
            <span className="flex-1 h-px bg-rule/60" />
            <span className="text-gold">❦</span>
            <span className="flex-1 h-px bg-rule/60" />
          </div>
        </header>

        <div className="mt-8">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
            id="scan-files"
          />

          {images.length === 0 ? (
            <label
              htmlFor="scan-files"
              className="block text-center py-14 border-2 border-dashed border-rule/60 rounded-md bg-paper-deep/30 cursor-pointer hover:border-terracotta/60 transition-colors"
            >
              <p className="font-serif italic text-lg text-ink">{t("scan_drop")}</p>
              <p className="mt-2 text-xs text-ink-soft">{t("scan_drop_hint")}</p>
            </label>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-[3/4] overflow-hidden rounded border border-rule/40 bg-muted"
                  >
                    <img
                      src={src}
                      alt={`page ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="remove"
                      className="absolute top-1 end-1 size-6 rounded-full bg-background/90 border border-border grid place-items-center text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {images.length < MAX_FILES && (
                  <label
                    htmlFor="scan-files"
                    className="aspect-[3/4] grid place-items-center rounded border-2 border-dashed border-rule/60 text-3xl text-ink-soft cursor-pointer hover:border-terracotta/60 hover:text-terracotta transition-colors"
                  >
                    +
                  </label>
                )}
              </div>
              <p className="mt-3 text-[11px] text-ink-soft italic text-center">
                {images.length}/{MAX_FILES} · {t("scan_more_hint")}
              </p>
            </>
          )}

          {error && (
            <p className="mt-4 text-xs text-destructive italic text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={onScan}
            disabled={images.length === 0 || loading}
            className="mt-6 w-full bg-ink text-paper py-3 rounded text-sm font-medium transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? t("scan_reading") : t("scan_go")}
          </button>
          <p className="mt-2 text-[10px] text-ink-soft italic text-center">
            {t("scan_uncertain_note")}
          </p>
        </div>
      </div>
    </div>
  );
}
