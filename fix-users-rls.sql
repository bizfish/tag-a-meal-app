-- Fix the users table RLS policy issue
-- This addresses the "new row violates row-level security policy for table users" error

-- First, disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create new, more permissive policies for users table
-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert own profile" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Allow users to view own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Allow users to delete own profile" 
ON public.users FOR DELETE 
TO authenticated 
USING (auth.uid() = id);

-- Alternative: If the above still doesn't work, use this more permissive policy
-- Uncomment the lines below if you still get RLS errors

-- DROP POLICY IF EXISTS "Allow authenticated users to insert own profile" ON public.users;
-- CREATE POLICY "Allow authenticated users to insert profile" 
-- ON public.users FOR INSERT 
-- TO authenticated 
-- WITH CHECK (true);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';
