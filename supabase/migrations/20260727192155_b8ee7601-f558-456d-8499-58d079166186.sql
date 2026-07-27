CREATE POLICY "Backend can manage recipe shares"
ON public.recipe_shares
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.create_recipe_share(_recipe jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  _bytes bytea;
  _id text;
  _i integer;
  _attempt integer;
BEGIN
  IF jsonb_typeof(_recipe) IS DISTINCT FROM 'object'
    OR length(trim(coalesce(_recipe->>'title', ''))) = 0
  THEN
    RAISE EXCEPTION 'Invalid recipe share payload';
  END IF;

  FOR _attempt IN 1..6 LOOP
    _bytes := gen_random_bytes(10);
    _id := '';

    FOR _i IN 0..9 LOOP
      _id := _id || substr(_alphabet, (get_byte(_bytes, _i) & 63) + 1, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.recipe_shares (id, recipe) VALUES (_id, _recipe);
      RETURN _id;
    EXCEPTION WHEN unique_violation THEN
      -- Try another random code.
    END;
  END LOOP;

  RAISE EXCEPTION 'Could not create recipe share';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recipe_share(_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT recipe
  FROM public.recipe_shares
  WHERE id = _id
    AND _id ~ '^[A-Za-z0-9_-]{8,24}$'
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.create_recipe_share(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recipe_share(text) TO anon, authenticated;