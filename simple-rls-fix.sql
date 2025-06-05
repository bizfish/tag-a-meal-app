-- Simple RLS fix - run this in Supabase SQL Editor
-- This will fix the most critical RLS issues

-- Temporarily disable RLS to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view public recipes and own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can manage ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can update recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can insert recipe tags for own recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can update recipe tags for own recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can delete recipe tags for own recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can view ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Authenticated users can create ingredients" ON public.ingredients;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Users table - allow authenticated users to manage their own profile
CREATE POLICY "users_all_own" ON public.users 
FOR ALL TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Recipes table - allow users to view public recipes and manage their own
CREATE POLICY "recipes_view_public_and_own" ON public.recipes 
FOR SELECT TO authenticated 
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "recipes_manage_own" ON public.recipes 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipes_update_own" ON public.recipes 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipes_delete_own" ON public.recipes 
FOR DELETE TO authenticated 
USING (user_id = auth.uid());

-- Recipe ingredients - allow users to manage ingredients for their own recipes
CREATE POLICY "recipe_ingredients_all" ON public.recipe_ingredients 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Recipe tags - allow users to manage tags for their own recipes
CREATE POLICY "recipe_tags_all" ON public.recipe_tags 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Ingredients - allow all authenticated users to read and create
CREATE POLICY "ingredients_all" ON public.ingredients 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- Tags - allow all authenticated users to read
CREATE POLICY "tags_read" ON public.tags 
FOR SELECT TO authenticated 
USING (true);

-- Verify policies were created
SELECT tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'recipes', 'recipe_ingredients', 'recipe_tags', 'ingredients', 'tags')
ORDER BY tablename, policyname;
