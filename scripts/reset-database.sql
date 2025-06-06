-- Reset Database to Default State
-- This script removes all user-added data and restores original default data

-- Disable RLS temporarily for cleanup (if needed)
-- Note: This should be run with service role key or admin privileges

-- Clear all user data in reverse dependency order
-- Start with junction tables and work backwards

-- Clear collection recipes
DELETE FROM public.collection_recipes;

-- Clear recipe collections
DELETE FROM public.recipe_collections;

-- Clear recipe ratings
DELETE FROM public.recipe_ratings;

-- Clear recipe tags (junction table)
DELETE FROM public.recipe_tags;

-- Clear recipe ingredients (junction table)
DELETE FROM public.recipe_ingredients;

-- Clear all recipes
DELETE FROM public.recipes;

-- Clear all users (this will cascade to related data)
DELETE FROM public.users;

-- Clear all tags except defaults
DELETE FROM public.tags WHERE name NOT IN (
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Quick & Easy', 'Healthy', 
  'Comfort Food', 'Dessert', 'Breakfast', 'Lunch', 'Dinner'
);

-- Clear all ingredients except defaults
DELETE FROM public.ingredients WHERE name NOT IN (
  'Salt', 'Black Pepper', 'Olive Oil', 'Garlic', 'Onion', 
  'Tomato', 'Flour', 'Sugar', 'Eggs', 'Milk'
);

-- Reset default tags (in case they were modified)
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
ON CONFLICT (name) DO UPDATE SET
  color = EXCLUDED.color;

-- Reset default ingredients (in case they were modified)
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
  ('Milk', 'Dairy')
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category;

-- Reset sequences (if needed)
-- Note: UUIDs don't use sequences, but if you had any serial columns, you'd reset them here

-- Verify the reset
SELECT 'Tags' as table_name, COUNT(*) as count FROM public.tags
UNION ALL
SELECT 'Ingredients' as table_name, COUNT(*) as count FROM public.ingredients
UNION ALL
SELECT 'Recipes' as table_name, COUNT(*) as count FROM public.recipes
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Recipe Ingredients' as table_name, COUNT(*) as count FROM public.recipe_ingredients
UNION ALL
SELECT 'Recipe Tags' as table_name, COUNT(*) as count FROM public.recipe_tags
UNION ALL
SELECT 'Recipe Ratings' as table_name, COUNT(*) as count FROM public.recipe_ratings
UNION ALL
SELECT 'Recipe Collections' as table_name, COUNT(*) as count FROM public.recipe_collections
UNION ALL
SELECT 'Collection Recipes' as table_name, COUNT(*) as count FROM public.collection_recipes;
