
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prep_time TEXT,
  cook_time TEXT,
  servings INTEGER DEFAULT 2,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_prompt TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipes are readable by anyone" ON public.recipes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert recipes" ON public.recipes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update recipes" ON public.recipes
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete recipes" ON public.recipes
  FOR DELETE USING (true);
