DROP POLICY IF EXISTS "Anyone can read recipe shares by link" ON public.recipe_shares;
DROP POLICY IF EXISTS "Anyone can create recipe shares" ON public.recipe_shares;

REVOKE ALL ON public.recipe_shares FROM anon;
REVOKE ALL ON public.recipe_shares FROM authenticated;
GRANT ALL ON public.recipe_shares TO service_role;