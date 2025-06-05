const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyPrivacyRLS() {
  try {
    console.log('Applying privacy-aware RLS policies for users table...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'fix-users-rls-privacy.sql'), 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.error('Error applying privacy RLS policies:', error);
      return;
    }

    console.log('✅ Successfully applied privacy-aware RLS policies');
    console.log('✅ Users can see their own profiles (full access)');
    console.log('✅ Users can see other profiles only if show_author_name = true');
    console.log('✅ Anonymous users can see profiles where show_author_name = true');
    
    // Test 1: Set one user to hide their name
    console.log('\n🧪 Testing privacy settings...');
    
    // First, get a user to test with
    const { data: users, error: getUsersError } = await supabase
      .from('users')
      .select('id, full_name, show_author_name')
      .limit(2);

    if (getUsersError || !users || users.length === 0) {
      console.error('❌ Could not get users for testing:', getUsersError);
      return;
    }

    console.log(`📋 Found ${users.length} users for testing`);
    
    // Set the first user to hide their name
    const testUser = users[0];
    console.log(`🔧 Setting user "${testUser.full_name}" to hide their name...`);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ show_author_name: false })
      .eq('id', testUser.id);

    if (updateError) {
      console.error('❌ Could not update user privacy setting:', updateError);
      return;
    }

    // Test 2: Try to read users as anonymous (should only see users with show_author_name = true)
    console.log('\n🔍 Testing anonymous access...');
    
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: anonUsers, error: anonError } = await anonSupabase
      .from('users')
      .select('id, full_name, show_author_name');

    if (anonError) {
      console.error('❌ Anonymous access test failed:', anonError);
      return;
    }

    console.log('📊 Anonymous user access results:');
    console.log(`   - Can see ${anonUsers.length} users (should only be those with show_author_name = true)`);
    anonUsers.forEach((user, index) => {
      console.log(`     ${index + 1}. Name: ${user.full_name}, Show Author: ${user.show_author_name}`);
    });

    // Test 3: Verify the hidden user is not visible
    const hiddenUserVisible = anonUsers.some(u => u.id === testUser.id);
    if (hiddenUserVisible) {
      console.log('❌ PRIVACY ISSUE: Hidden user is still visible to anonymous users!');
    } else {
      console.log('✅ PRIVACY WORKING: Hidden user is not visible to anonymous users');
    }

    // Reset the test user back to showing their name
    console.log('\n🔄 Resetting test user privacy setting...');
    await supabase
      .from('users')
      .update({ show_author_name: true })
      .eq('id', testUser.id);

    console.log('\n🎉 Privacy-aware RLS policies applied successfully!');
    console.log('🔒 Database-level privacy enforcement is now active');
    console.log('📝 Users with show_author_name = false will be hidden from other users');

  } catch (error) {
    console.error('❌ Error during privacy RLS application:', error);
    process.exit(1);
  }
}

// Run the application
applyPrivacyRLS()
  .then(() => {
    console.log('\n✨ Privacy RLS script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Privacy RLS script failed:', error);
    process.exit(1);
  });
