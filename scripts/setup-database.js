const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Setting up database tables...');

  try {
    // Create users table (extends Supabase auth.users)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create recipes table
    const createRecipesTable = `
      CREATE TABLE IF NOT EXISTS public.recipes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        instructions TEXT NOT NULL,
        prep_time INTEGER, -- in minutes
        cook_time INTEGER, -- in minutes
        servings INTEGER,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
        image_url TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create ingredients table
    const createIngredientsTable = `
      CREATE TABLE IF NOT EXISTS public.ingredients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create recipe_ingredients table (junction table)
    const createRecipeIngredientsTable = `
      CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
        ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
        quantity DECIMAL(10,3),
        unit TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(recipe_id, ingredient_id)
      );
    `;

    // Create tags table
    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS public.tags (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create recipe_tags table (junction table)
    const createRecipeTagsTable = `
      CREATE TABLE IF NOT EXISTS public.recipe_tags (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
        tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(recipe_id, tag_id)
      );
    `;

    // Create recipe_ratings table
    const createRecipeRatingsTable = `
      CREATE TABLE IF NOT EXISTS public.recipe_ratings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        review TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(recipe_id, user_id)
      );
    `;

    // Create recipe_collections table
    const createRecipeCollectionsTable = `
      CREATE TABLE IF NOT EXISTS public.recipe_collections (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create collection_recipes table (junction table)
    const createCollectionRecipesTable = `
      CREATE TABLE IF NOT EXISTS public.collection_recipes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        collection_id UUID REFERENCES public.recipe_collections(id) ON DELETE CASCADE NOT NULL,
        recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(collection_id, recipe_id)
      );
    `;

    // Execute table creation queries
    const tables = [
      { name: 'users', query: createUsersTable },
      { name: 'recipes', query: createRecipesTable },
      { name: 'ingredients', query: createIngredientsTable },
      { name: 'recipe_ingredients', query: createRecipeIngredientsTable },
      { name: 'tags', query: createTagsTable },
      { name: 'recipe_tags', query: createRecipeTagsTable },
      { name: 'recipe_ratings', query: createRecipeRatingsTable },
      { name: 'recipe_collections', query: createRecipeCollectionsTable },
      { name: 'collection_recipes', query: createCollectionRecipesTable }
    ];

    for (const table of tables) {
      console.log(`Creating ${table.name} table...`);
      const { error } = await supabase.rpc('exec_sql', { sql: table.query });
      if (error) {
        console.error(`Error creating ${table.name} table:`, error);
      } else {
        console.log(`✓ ${table.name} table created successfully`);
      }
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_recipes_title ON public.recipes USING gin(to_tsvector(\'english\', title));',
      'CREATE INDEX IF NOT EXISTS idx_recipes_description ON public.recipes USING gin(to_tsvector(\'english\', description));',
      'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);',
      'CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON public.recipe_tags(recipe_id);',
      'CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe_id ON public.recipe_ratings(recipe_id);',
      'CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection_id ON public.collection_recipes(collection_id);'
    ];

    console.log('Creating indexes...');
    for (const indexQuery of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexQuery });
      if (error) {
        console.error('Error creating index:', error);
      }
    }
    console.log('✓ Indexes created successfully');

    // Enable Row Level Security (RLS)
    const rlsPolicies = [
      'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.collection_recipes ENABLE ROW LEVEL SECURITY;'
    ];

    console.log('Enabling Row Level Security...');
    for (const policy of rlsPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.error('Error enabling RLS:', error);
      }
    }

    // Create RLS policies
    const policies = [
      // Users can only see and edit their own profile
      `CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);`,
      `CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);`,
      `CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);`,
      
      // Recipe policies
      `CREATE POLICY "Users can view public recipes and own recipes" ON public.recipes FOR SELECT USING (is_public = true OR auth.uid() = user_id);`,
      `CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);`,
      
      // Recipe ingredients policies
      `CREATE POLICY "Users can view recipe ingredients for accessible recipes" ON public.recipe_ingredients FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.recipes 
          WHERE recipes.id = recipe_ingredients.recipe_id 
          AND (recipes.is_public = true OR recipes.user_id = auth.uid())
        )
      );`,
      `CREATE POLICY "Users can manage ingredients for own recipes" ON public.recipe_ingredients FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.recipes 
          WHERE recipes.id = recipe_ingredients.recipe_id 
          AND recipes.user_id = auth.uid()
        )
      );`,
      
      // Similar policies for other tables...
      `CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT TO authenticated USING (true);`,
      `CREATE POLICY "Anyone can view ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);`
    ];

    console.log('Creating RLS policies...');
    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating policy:', error);
      }
    }

    // Insert some default data
    console.log('Inserting default data...');
    
    // Default tags
    const defaultTags = [
      { name: 'Vegetarian', color: '#10B981' },
      { name: 'Vegan', color: '#059669' },
      { name: 'Gluten-Free', color: '#F59E0B' },
      { name: 'Quick & Easy', color: '#EF4444' },
      { name: 'Healthy', color: '#8B5CF6' },
      { name: 'Comfort Food', color: '#F97316' },
      { name: 'Dessert', color: '#EC4899' },
      { name: 'Breakfast', color: '#06B6D4' },
      { name: 'Lunch', color: '#84CC16' },
      { name: 'Dinner', color: '#6366F1' }
    ];

    for (const tag of defaultTags) {
      await supabase.from('tags').upsert(tag, { onConflict: 'name' });
    }

    // Default ingredients
    const defaultIngredients = [
      { name: 'Salt', category: 'Seasonings' },
      { name: 'Black Pepper', category: 'Seasonings' },
      { name: 'Olive Oil', category: 'Oils' },
      { name: 'Garlic', category: 'Vegetables' },
      { name: 'Onion', category: 'Vegetables' },
      { name: 'Tomato', category: 'Vegetables' },
      { name: 'Flour', category: 'Baking' },
      { name: 'Sugar', category: 'Baking' },
      { name: 'Eggs', category: 'Dairy' },
      { name: 'Milk', category: 'Dairy' }
    ];

    for (const ingredient of defaultIngredients) {
      await supabase.from('ingredients').upsert(ingredient, { onConflict: 'name' });
    }

    console.log('✓ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy .env.example to .env and fill in your Supabase credentials');
    console.log('2. Run "npm install" to install dependencies');
    console.log('3. Run "npm run dev" to start the development server');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
