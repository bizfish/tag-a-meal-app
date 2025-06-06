const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createRLSPoliciesDirect() {
  console.log('Creating RLS policies directly through Supabase client...');

  try {
    // First, let's check current policies
    console.log('\nChecking current policies...');
    
    // Query the pg_policies view to see current policies
    const { data: currentPolicies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE schemaname = 'public' AND tablename IN ('tags', 'ingredients')
          ORDER BY tablename, policyname;
        `
      });

    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    } else {
      console.log('Current policies:', currentPolicies);
    }

    // Create policies using direct SQL that should show up in Supabase dashboard
    const policies = [
      {
        name: 'Enable read access for authenticated users on tags',
        table: 'tags',
        sql: `CREATE POLICY "Enable read access for authenticated users" ON "public"."tags" AS PERMISSIVE FOR SELECT TO authenticated USING (true)`
      },
      {
        name: 'Enable insert access for authenticated users on tags',
        table: 'tags', 
        sql: `CREATE POLICY "Enable insert access for authenticated users" ON "public"."tags" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true)`
      },
      {
        name: 'Enable update access for authenticated users on tags',
        table: 'tags',
        sql: `CREATE POLICY "Enable update access for authenticated users" ON "public"."tags" AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`
      },
      {
        name: 'Enable delete access for authenticated users on tags',
        table: 'tags',
        sql: `CREATE POLICY "Enable delete access for authenticated users" ON "public"."tags" AS PERMISSIVE FOR DELETE TO authenticated USING (true)`
      },
      {
        name: 'Enable read access for authenticated users on ingredients',
        table: 'ingredients',
        sql: `CREATE POLICY "Enable read access for authenticated users" ON "public"."ingredients" AS PERMISSIVE FOR SELECT TO authenticated USING (true)`
      },
      {
        name: 'Enable insert access for authenticated users on ingredients',
        table: 'ingredients',
        sql: `CREATE POLICY "Enable insert access for authenticated users" ON "public"."ingredients" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true)`
      }
    ];

    // Drop existing policies first
    console.log('\nDropping existing policies...');
    const dropStatements = [
      'DROP POLICY IF EXISTS "Allow all operations on tags for authenticated users" ON public.tags',
      'DROP POLICY IF EXISTS "Allow all operations on ingredients for authenticated users" ON public.ingredients',
      'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tags',
      'DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.tags',
      'DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.tags', 
      'DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.tags',
      'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ingredients',
      'DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.ingredients'
    ];

    for (const dropSql of dropStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: dropSql });
      if (error && !error.message.includes('does not exist')) {
        console.error('Error dropping policy:', error);
      }
    }

    // Create new policies
    console.log('\nCreating new policies...');
    for (const policy of policies) {
      console.log(`Creating policy: ${policy.name}`);
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.error(`Error creating policy ${policy.name}:`, error);
      } else {
        console.log(`✓ Created policy: ${policy.name}`);
      }
    }

    // Test tag creation
    console.log('\nTesting tag creation...');
    const testTag = {
      name: `Test Tag ${Date.now()}`,
      color: '#00FF00'
    };

    const { data: createdTag, error: createError } = await supabase
      .from('tags')
      .insert(testTag)
      .select()
      .single();

    if (createError) {
      console.error('❌ Test tag creation failed:', createError);
    } else {
      console.log('✅ Test tag created successfully:', createdTag);
      
      // Clean up test tag
      await supabase.from('tags').delete().eq('id', createdTag.id);
      console.log('✓ Test tag cleaned up');
    }

    // Check policies again
    console.log('\nChecking policies after creation...');
    const { data: newPolicies, error: newPoliciesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE schemaname = 'public' AND tablename IN ('tags', 'ingredients')
          ORDER BY tablename, policyname;
        `
      });

    if (newPoliciesError) {
      console.error('Error checking new policies:', newPoliciesError);
    } else {
      console.log('New policies:', newPolicies);
    }

    console.log('\n✓ RLS policies created successfully!');
    console.log('These policies should now be visible in the Supabase dashboard.');

  } catch (error) {
    console.error('Error creating RLS policies:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  createRLSPoliciesDirect();
}

module.exports = { createRLSPoliciesDirect };
