const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addAuthorPrivacySetting() {
  try {
    console.log('Adding show_author_name column to users table...');
    
    // Add the column to the users table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS show_author_name BOOLEAN DEFAULT true;
        
        -- Update existing users to show author name by default
        UPDATE public.users 
        SET show_author_name = true 
        WHERE show_author_name IS NULL;
        
        -- Add comment to document the column
        COMMENT ON COLUMN public.users.show_author_name IS 'Whether to display the user''s name on their recipes';
      `
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
      return;
    }

    console.log('✅ Successfully added show_author_name column to users table');
    console.log('✅ All existing users set to show author name by default');
    
    // Verify the column was added
    const { data: columns, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name = 'show_author_name';
      `
    });

    if (verifyError) {
      console.error('Error verifying column:', verifyError);
      return;
    }

    if (columns && columns.length > 0) {
      console.log('✅ Column verification successful:');
      console.log('   - Column name:', columns[0].column_name);
      console.log('   - Data type:', columns[0].data_type);
      console.log('   - Default value:', columns[0].column_default);
      console.log('   - Nullable:', columns[0].is_nullable);
    } else {
      console.log('⚠️  Column verification failed - column not found');
    }

    // Check current user count and their settings
    const { data: userCount, error: countError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN show_author_name = true THEN 1 END) as showing_name,
          COUNT(CASE WHEN show_author_name = false THEN 1 END) as hiding_name
        FROM public.users;
      `
    });

    if (countError) {
      console.error('Error checking user count:', countError);
      return;
    }

    if (userCount && userCount.length > 0) {
      const stats = userCount[0];
      console.log('\n📊 User Privacy Settings Summary:');
      console.log(`   - Total users: ${stats.total_users}`);
      console.log(`   - Showing author name: ${stats.showing_name}`);
      console.log(`   - Hiding author name: ${stats.hiding_name}`);
    }

    console.log('\n🎉 Database migration completed successfully!');
    console.log('Users can now control whether their name appears on recipes via their profile settings.');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
addAuthorPrivacySetting()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
