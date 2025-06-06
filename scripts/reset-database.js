const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetDatabase() {
  console.log('🔄 Resetting database to default state...');
  console.log('⚠️  This will remove ALL user data and restore only default tags and ingredients!');

  try {
    // Clear all user data in reverse dependency order
    console.log('Clearing collection recipes...');
    await supabase.from('collection_recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing recipe collections...');
    await supabase.from('recipe_collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing recipe ratings...');
    await supabase.from('recipe_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing recipe tags...');
    await supabase.from('recipe_tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing recipe ingredients...');
    await supabase.from('recipe_ingredients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing recipes...');
    await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Clearing users...');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Clear non-default tags
    console.log('Clearing non-default tags...');
    const defaultTagNames = [
      'Vegetarian', 'Vegan', 'Gluten-Free', 'Quick & Easy', 'Healthy', 
      'Comfort Food', 'Dessert', 'Breakfast', 'Lunch', 'Dinner'
    ];
    await supabase.from('tags').delete().not('name', 'in', `(${defaultTagNames.map(name => `'${name}'`).join(',')})`);

    // Clear non-default ingredients
    console.log('Clearing non-default ingredients...');
    const defaultIngredientNames = [
      'Salt', 'Black Pepper', 'Olive Oil', 'Garlic', 'Onion', 
      'Tomato', 'Flour', 'Sugar', 'Eggs', 'Milk'
    ];
    await supabase.from('ingredients').delete().not('name', 'in', `(${defaultIngredientNames.map(name => `'${name}'`).join(',')})`);

    // Reset default tags (in case they were modified)
    console.log('Restoring default tags...');
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
      const { error } = await supabase.from('tags').upsert(tag, { onConflict: 'name' });
      if (error) {
        console.error(`Error upserting tag ${tag.name}:`, error);
      }
    }

    // Reset default ingredients (in case they were modified)
    console.log('Restoring default ingredients...');
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
      const { error } = await supabase.from('ingredients').upsert(ingredient, { onConflict: 'name' });
      if (error) {
        console.error(`Error upserting ingredient ${ingredient.name}:`, error);
      }
    }

    // Verify the reset
    console.log('\n📊 Verifying reset results:');
    
    const tables = [
      'tags', 'ingredients', 'recipes', 'users', 
      'recipe_ingredients', 'recipe_tags', 'recipe_ratings', 
      'recipe_collections', 'collection_recipes'
    ];

    for (const table of tables) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`Error counting ${table}:`, error);
      } else {
        console.log(`${table}: ${count} records`);
      }
    }

    console.log('\n✅ Database reset completed successfully!');
    console.log('📝 The database now contains only:');
    console.log('   - 10 default tags');
    console.log('   - 10 default ingredients');
    console.log('   - No users, recipes, or other data');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

// Add confirmation prompt
async function confirmReset() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  Are you sure you want to reset the database? This will DELETE ALL DATA! (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Run the reset if this script is executed directly
if (require.main === module) {
  (async () => {
    const confirmed = await confirmReset();
    if (confirmed) {
      await resetDatabase();
    } else {
      console.log('❌ Database reset cancelled.');
    }
  })();
}

module.exports = { resetDatabase };
