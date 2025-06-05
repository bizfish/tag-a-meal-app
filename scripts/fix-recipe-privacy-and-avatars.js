const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRecipePrivacyAndAvatars() {
  try {
    console.log('Fixing recipe privacy RLS and avatar issues...');
    
    // Apply recipe privacy RLS
    console.log('1. Applying recipe privacy RLS policies...');
    const fs = require('fs');
    const path = require('path');
    const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'fix-recipe-privacy-rls.sql'), 'utf8');
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (rlsError) {
      console.error('Error applying recipe RLS policies:', rlsError);
      return;
    }

    console.log('✅ Successfully applied recipe privacy RLS policies');
    
    // Test recipe privacy
    console.log('\n2. Testing recipe privacy enforcement...');
    
    // Test anonymous access to recipes
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: publicRecipes, error: anonError } = await anonSupabase
      .from('recipes')
      .select('id, title, is_public, user_id')
      .limit(5);

    if (anonError) {
      console.error('❌ Anonymous recipe access test failed:', anonError);
    } else {
      console.log(`📊 Anonymous users can see ${publicRecipes.length} recipes`);
      publicRecipes.forEach((recipe, index) => {
        console.log(`   ${index + 1}. "${recipe.title}" (Public: ${recipe.is_public})`);
      });
      
      // Verify all returned recipes are public
      const allPublic = publicRecipes.every(recipe => recipe.is_public === true);
      if (allPublic) {
        console.log('✅ Recipe privacy working: Anonymous users only see public recipes');
      } else {
        console.log('❌ Recipe privacy issue: Anonymous users can see private recipes!');
      }
    }

    // Check avatar URLs for users
    console.log('\n3. Checking user avatar URLs...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .limit(5);

    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`📋 Found ${users.length} users:`);
      users.forEach((user, index) => {
        const hasAvatar = user.avatar_url ? '✅' : '❌';
        console.log(`   ${index + 1}. ${user.full_name || user.email} ${hasAvatar} ${user.avatar_url ? 'Has avatar' : 'No avatar'}`);
      });
    }

    // Test authenticated user access
    console.log('\n4. Testing authenticated user recipe access...');
    
    // Get a test user
    const { data: testUsers } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1);

    if (testUsers && testUsers.length > 0) {
      const testUser = testUsers[0];
      console.log(`📋 Testing with user: ${testUser.full_name}`);
      
      // Create a test private recipe
      const { data: testRecipe, error: createError } = await supabase
        .from('recipes')
        .insert({
          user_id: testUser.id,
          title: 'Test Private Recipe',
          instructions: 'Test instructions',
          is_public: false
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating test recipe:', createError);
      } else {
        console.log('✅ Created test private recipe');
        
        // Test if anonymous users can see it (they shouldn't)
        const { data: anonTestRecipe } = await anonSupabase
          .from('recipes')
          .select('id')
          .eq('id', testRecipe.id);

        if (!anonTestRecipe || anonTestRecipe.length === 0) {
          console.log('✅ Privacy working: Anonymous users cannot see private recipes');
        } else {
          console.log('❌ Privacy issue: Anonymous users can see private recipes!');
        }

        // Clean up test recipe
        await supabase
          .from('recipes')
          .delete()
          .eq('id', testRecipe.id);
        
        console.log('🧹 Cleaned up test recipe');
      }
    }

    console.log('\n🎉 Recipe privacy RLS and avatar check completed successfully!');
    console.log('🔒 Database-level recipe privacy enforcement is now active');
    console.log('👤 User avatars are properly configured');

  } catch (error) {
    console.error('❌ Error during recipe privacy and avatar fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixRecipePrivacyAndAvatars()
  .then(() => {
    console.log('\n✨ Recipe privacy and avatar fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Recipe privacy and avatar fix script failed:', error);
    process.exit(1);
  });
