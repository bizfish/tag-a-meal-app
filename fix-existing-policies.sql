-- Fix existing RLS policies that are causing issues
-- This script handles existing policies by dropping and recreating them

-- Drop ALL existing policies on users table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- Drop ALL existing policies on recipe_ingredients table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recipe_ingredients' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.recipe_ingredients';
    END LOOP;
END $$;

-- Drop ALL existing policies on recipe_tags table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recipe_tags' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.recipe_tags';
    END LOOP;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Create new users table policies
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- Create new recipe_ingredients policies
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
);

CREATE POLICY "recipe_ingredients_insert" ON public.recipe_ingredients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "recipe_ingredients_update" ON public.recipe_ingredients FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "recipe_ingredients_delete" ON public.recipe_ingredients FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Create new recipe_tags policies
CREATE POLICY "recipe_tags_select" ON public.recipe_tags FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
);

CREATE POLICY "recipe_tags_insert" ON public.recipe_tags FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "recipe_tags_update" ON public.recipe_tags FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "recipe_tags_delete" ON public.recipe_tags FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Allow authenticated users to read tags and ingredients
CREATE POLICY "tags_select_all" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_select_all" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert_all" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);

-- Show the policies that were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'recipe_ingredients', 'recipe_tags', 'tags', 'ingredients')
ORDER BY tablename, policyname;
