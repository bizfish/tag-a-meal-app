const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Setting up database with direct client methods...');

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (testError) {
      console.error('Database connection failed:', testError);
      return;
    }

    console.log('✓ Database connection successful');

    // Insert default tags using direct client methods
    console.log('Inserting default tags...');
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
      const { error } = await supabase
        .from('tags')
        .upsert(tag, { onConflict: 'name' });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`Error inserting tag ${tag.name}:`, error);
      } else {
        console.log(`✓ Tag "${tag.name}" inserted/updated`);
      }
    }

    // Insert default ingredients
    console.log('Inserting default ingredients...');
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
      { name: 'Milk', category: 'Dairy' },
      { name: 'Butter', category: 'Dairy' },
      { name: 'Chicken Breast', category: 'Meat' },
      { name: 'Ground Beef', category: 'Meat' },
      { name: 'Rice', category: 'Grains' },
      { name: 'Pasta', category: 'Grains' }
    ];

    for (const ingredient of defaultIngredients) {
      const { error } = await supabase
        .from('ingredients')
        .upsert(ingredient, { onConflict: 'name' });
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`Error inserting ingredient ${ingredient.name}:`, error);
      } else {
        console.log(`✓ Ingredient "${ingredient.name}" inserted/updated`);
      }
    }

    console.log('\n✓ Database setup completed successfully!');
    console.log('\nIMPORTANT: You still need to run the RLS policies manually:');
    console.log('1. Go to your Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the contents of fix-database-policies.sql');
    console.log('3. Click "Run" to execute the policies');
    console.log('\nOr run the enable-exec-sql.sql first, then run the original setup script.');

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
