-- First, drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can manage ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can update recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete recipe ingredients for own recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can insert recipe tags for own recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can update recipe tags for own recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can delete recipe tags for own recipes" ON public.recipe_tags;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_recipes ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Recipe policies
CREATE POLICY "Users can view public recipes and own recipes" ON public.recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- Recipe ingredients policies
CREATE POLICY "Users can view recipe ingredients for accessible recipes" ON public.recipe_ingredients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert recipe ingredients for own recipes" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recipe ingredients for own recipes" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recipe ingredients for own recipes" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ingredients.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Recipe tags policies
CREATE POLICY "Users can view recipe tags for accessible recipes" ON public.recipe_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert recipe tags for own recipes" ON public.recipe_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recipe tags for own recipes" ON public.recipe_tags FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recipe tags for own recipes" ON public.recipe_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND recipes.user_id = auth.uid()
  )
);

-- Recipe ratings policies
CREATE POLICY "Users can view recipe ratings for accessible recipes" ON public.recipe_ratings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = recipe_ratings.recipe_id 
    AND (recipes.is_public = true OR recipes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own recipe ratings" ON public.recipe_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipe ratings" ON public.recipe_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipe ratings" ON public.recipe_ratings FOR DELETE USING (auth.uid() = user_id);

-- Recipe collections policies
CREATE POLICY "Users can view own collections" ON public.recipe_collections FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own collections" ON public.recipe_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own collections" ON public.recipe_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own collections" ON public.recipe_collections FOR DELETE USING (auth.uid() = user_id);

-- Collection recipes policies
CREATE POLICY "Users can view collection recipes for accessible collections" ON public.collection_recipes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recipe_collections 
    WHERE recipe_collections.id = collection_recipes.collection_id 
    AND (recipe_collections.is_public = true OR recipe_collections.user_id = auth.uid())
  )
);

CREATE POLICY "Users can manage collection recipes for own collections" ON public.collection_recipes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipe_collections 
    WHERE recipe_collections.id = collection_recipes.collection_id 
    AND recipe_collections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update collection recipes for own collections" ON public.collection_recipes FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recipe_collections 
    WHERE recipe_collections.id = collection_recipes.collection_id 
    AND recipe_collections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete collection recipes for own collections" ON public.collection_recipes FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recipe_collections 
    WHERE recipe_collections.id = collection_recipes.collection_id 
    AND recipe_collections.user_id = auth.uid()
  )
);

-- Tags and ingredients policies (allow authenticated users to read)
CREATE POLICY "Authenticated users can view tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create new ingredients when creating recipes
CREATE POLICY "Authenticated users can create ingredients" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON public.recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON public.recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe_id ON public.recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user_id ON public.recipe_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection_id ON public.collection_recipes(collection_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collections_user_id ON public.recipe_collections(user_id);

-- Insert default tags if they don't exist
INSERT INTO public.tags (name, color) VALUES 
  ('Vegetarian', '#10B981'),
  ('Vegan', '#059669'),
  ('Gluten-Free', '#F59E0B'),
  ('Quick & Easy', '#EF4444'),
  ('Healthy', '#8B5CF6'),
  ('Comfort Food', '#F97316'),
  ('Dessert', '#EC4899'),
  ('Breakfast', '#06B6D4'),
  ('Lunch', '#84CC16'),
  ('Dinner', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Insert default ingredients if they don't exist
INSERT INTO public.ingredients (name, category) VALUES 
  ('Salt', 'Seasonings'),
  ('Black Pepper', 'Seasonings'),
  ('Olive Oil', 'Oils'),
  ('Garlic', 'Vegetables'),
  ('Onion', 'Vegetables'),
  ('Tomato', 'Vegetables'),
  ('Flour', 'Baking'),
  ('Sugar', 'Baking'),
  ('Eggs', 'Dairy'),
  ('Milk', 'Dairy'),
  ('Butter', 'Dairy'),
  ('Chicken Breast', 'Meat'),
  ('Ground Beef', 'Meat'),
  ('Rice', 'Grains'),
  ('Pasta', 'Grains')
ON CONFLICT (name) DO NOTHING;
