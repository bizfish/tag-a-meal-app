-- Advanced RLS policies for users table that respect privacy settings

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading user profiles for recipes" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create privacy-aware read policy
-- Users can see:
-- 1. Their own profile (full access)
-- 2. Other users' profiles only if show_author_name is true
-- 3. Anonymous users can see profiles where show_author_name is true
CREATE POLICY "Privacy-aware user profile access" ON public.users
FOR SELECT USING (
  -- User can always see their own profile
  auth.uid() = id 
  OR 
  -- Others can see profile only if user has opted to show their name
  (show_author_name = true)
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT, UPDATE ON public.users TO authenticated;
