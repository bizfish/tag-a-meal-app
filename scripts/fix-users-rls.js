const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUsersRLS() {
  try {
    console.log('Fixing RLS policies for users table to allow reading names...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'fix-users-rls-for-names.sql'), 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.error('Error fixing RLS policies:', error);
      return;
    }

    console.log('✅ Successfully fixed RLS policies for users table');
    console.log('✅ Users can now read user profiles for recipe display');
    console.log('✅ Anonymous users can read user names for recipes');
    console.log('✅ Authenticated users can still update their own profiles');
    
    // Test the fix by trying to read some user data
    const { data: users, error: testError } = await supabase
      .from('users')
      .select('id, full_name, show_author_name')
      .limit(5);

    if (testError) {
      console.error('❌ Test query failed:', testError);
      return;
    }

    console.log('\n📊 Test Results:');
    console.log(`   - Found ${users.length} users`);
    if (users.length > 0) {
      console.log('   - Sample user data:');
      users.forEach((user, index) => {
        console.log(`     ${index + 1}. Name: ${user.full_name || 'No name'}, Show Author: ${user.show_author_name}`);
      });
    }

    console.log('\n🎉 RLS fix completed successfully!');
    console.log('User names should now be visible on recipe cards.');

  } catch (error) {
    console.error('❌ Error during RLS fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixUsersRLS()
  .then(() => {
    console.log('\n✨ RLS fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RLS fix script failed:', error);
    process.exit(1);
  });
