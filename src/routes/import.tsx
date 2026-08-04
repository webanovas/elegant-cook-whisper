import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { saveRecipe } from "@/lib/recipes-store";
import { createRecipeCoverDataUrl } from "@/lib/recipe-images";
import { refreshRecipeHeroImage } from "@/lib/recipe-hero";
import { decodeSharedRecipe, fetchSharedRecipeByCode } from "@/lib/share";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/import")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Import Recipe — CookNotes" },
      {
        name: "description",
        content: "Open a shared CookNotes recipe and save it privately to this device.",
      },
      { property: "og:title", content: "Import Recipe — CookNotes" },
      {
        property: "og:description",
        content: "Open a shared CookNotes recipe and save it privately to this device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportRecipe,
});

function ImportRecipe() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hash = window.location.hash.replace(/^#/, "");
        const search = window.location.search.replace(/^\?/, "");
        const params = new URLSearchParams(hash || search);
        const code = params.get("s") || params.get("share");
        const encoded = params.get("d") || params.get("data");
        if (!code && !encoded) {
          if (!cancelled) setError(t("import_no_payload"));
          return;
        }
        const recipe = code
          ? await fetchSharedRecipeByCode(code)
          : await decodeSharedRecipe(encoded ?? "");
        if (cancelled) return;
        if (!recipe) {
          setError(t("import_bad_payload"));
          return;
        }
        // Shared images often 404 or fail to load on the recipient's device.
        // Save an instant local cookbook cover first, then replace it with a
        // freshly generated food image in the background. This guarantees the
        // imported recipe never lands as an empty/blank image slot.
        const saved = saveRecipe({
          ...recipe,
          image_url: createRecipeCoverDataUrl(recipe),
        });
        router.navigate({ to: "/recipes/$id", params: { id: saved.id }, replace: true });
        refreshRecipeHeroImage(saved).catch((e) =>
          console.error("shared recipe hero image gen failed", e),
        );

      } catch (e) {
        if (!cancelled) setError((e as Error).message || t("import_bad_payload"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="font-serif text-2xl mb-2">{t("import_failed")}</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/" })}
              className="text-sm text-primary underline"
            >
              {t("back_cookbook")}
            </button>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl mb-2">{t("import_saving")}</p>
            <p className="text-sm text-muted-foreground italic">
              {t("import_hint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
