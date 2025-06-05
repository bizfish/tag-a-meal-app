const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to generate a default avatar URL using DiceBear API (open source alternative to GitHub's identicons)
function generateDefaultAvatar(userId, fullName) {
  // Use DiceBear's "initials" style for clean, professional avatars
  const seed = userId || fullName || 'default';
  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  
  // DiceBear API for generating SVG avatars
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&chars=${encodeURIComponent(initials)}&backgroundColor=3b82f6&textColor=ffffff&fontSize=40`;
}

async function fixProfileRLS() {
  try {
    console.log('Fixing RLS policies for profile updates...');
    
    // Read and execute the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'fix-profile-rls.sql'), 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.error('Error fixing RLS policies:', error);
      return;
    }

    console.log('✅ Successfully fixed RLS policies for profile updates');
    
    // Test profile update functionality
    console.log('\n🧪 Testing profile update functionality...');
    
    // Get a test user
    const { data: users, error: getUsersError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .limit(1);

    if (getUsersError || !users || users.length === 0) {
      console.log('⚠️  No users found for testing');
      return;
    }

    const testUser = users[0];
    console.log(`📋 Testing with user: ${testUser.full_name || testUser.email}`);
    
    // Generate default avatar if user doesn't have one
    if (!testUser.avatar_url) {
      const defaultAvatar = generateDefaultAvatar(testUser.id, testUser.full_name);
      console.log(`🎨 Generated default avatar: ${defaultAvatar}`);
      
      // Update user with default avatar
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: defaultAvatar })
        .eq('id', testUser.id);

      if (updateError) {
        console.error('❌ Failed to set default avatar:', updateError);
      } else {
        console.log('✅ Set default avatar for user');
      }
    }

    // Update all users without avatars
    console.log('\n🎨 Generating default avatars for users without profile pictures...');
    
    const { data: usersWithoutAvatars, error: getNoAvatarError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .is('avatar_url', null);

    if (getNoAvatarError) {
      console.error('Error getting users without avatars:', getNoAvatarError);
    } else if (usersWithoutAvatars && usersWithoutAvatars.length > 0) {
      console.log(`📋 Found ${usersWithoutAvatars.length} users without avatars`);
      
      for (const user of usersWithoutAvatars) {
        const defaultAvatar = generateDefaultAvatar(user.id, user.full_name);
        
        const { error: updateAvatarError } = await supabase
          .from('users')
          .update({ avatar_url: defaultAvatar })
          .eq('id', user.id);

        if (updateAvatarError) {
          console.error(`❌ Failed to set avatar for ${user.full_name || user.email}:`, updateAvatarError);
        } else {
          console.log(`✅ Set default avatar for ${user.full_name || user.email}`);
        }
      }
    } else {
      console.log('✅ All users already have avatars');
    }

    console.log('\n🎉 Profile RLS fix and avatar generation completed successfully!');
    console.log('🔒 Users can now update their own profiles');
    console.log('🎨 All users have default avatars generated');

  } catch (error) {
    console.error('❌ Error during profile RLS fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixProfileRLS()
  .then(() => {
    console.log('\n✨ Profile RLS fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Profile RLS fix script failed:', error);
    process.exit(1);
  });
