import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { saveRecipe } from "@/lib/recipes-store";
import { decodeSharedRecipe } from "@/lib/share";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/import")({
  ssr: false,
  head: () => ({ meta: [{ title: "Import Recipe — Gourmet Notes" }] }),
  component: ImportRecipe,
});

function ImportRecipe() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Payload lives in the URL hash (?d=... or #d=...) so it never hits any
      // server and works fully offline once the app is installed.
      const hash = window.location.hash.replace(/^#/, "");
      const search = window.location.search.replace(/^\?/, "");
      const params = new URLSearchParams(hash || search);
      const encoded = params.get("d") || params.get("data");
      if (!encoded) {
        setError(t("import_no_payload"));
        return;
      }
      const recipe = decodeSharedRecipe(encoded);
      if (!recipe) {
        setError(t("import_bad_payload"));
        return;
      }
      const saved = saveRecipe(recipe);
      router.navigate({ to: "/recipes/$id", params: { id: saved.id }, replace: true });
    } catch (e) {
      setError((e as Error).message || t("import_bad_payload"));
    }
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
