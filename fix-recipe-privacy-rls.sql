-- Fix RLS policies for recipes table to enforce privacy at database level

-- Drop existing recipe policies
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;

-- Create comprehensive recipe privacy policy
-- Users can see:
-- 1. Their own recipes (both public and private)
-- 2. Public recipes from other users
-- 3. Anonymous users can only see public recipes
CREATE POLICY "Recipe privacy policy" ON public.recipes
FOR SELECT USING (
  -- User can always see their own recipes
  auth.uid() = user_id 
  OR 
  -- Others (including anonymous) can only see public recipes
  is_public = true
);

-- Users can insert their own recipes
CREATE POLICY "Users can insert own recipes" ON public.recipes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recipes
CREATE POLICY "Users can update own recipes" ON public.recipes
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recipes
CREATE POLICY "Users can delete own recipes" ON public.recipes
FOR DELETE USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.recipes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
