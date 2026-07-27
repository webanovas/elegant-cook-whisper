CREATE TABLE public.recipe_shares (
  id text PRIMARY KEY,
  recipe jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.recipe_shares TO anon;
GRANT SELECT, INSERT ON public.recipe_shares TO authenticated;
GRANT ALL ON public.recipe_shares TO service_role;

ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recipe shares by link"
ON public.recipe_shares
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create recipe shares"
ON public.recipe_shares
FOR INSERT
TO anon, authenticated
WITH CHECK (
  jsonb_typeof(recipe) = 'object'
  AND length(id) BETWEEN 8 AND 24
  AND id ~ '^[A-Za-z0-9_-]+$'
);

CREATE INDEX recipe_shares_created_at_idx ON public.recipe_shares (created_at DESC);