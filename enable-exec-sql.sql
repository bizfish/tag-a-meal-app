-- Create the exec_sql function to allow dynamic SQL execution
-- This should be run in Supabase SQL Editor with your service role

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Execute the SQL and return a success indicator
    EXECUTE sql;
    result := json_build_object('success', true);
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
        RETURN result;
END;
$$;

-- Grant execute permission to the service role
-- Replace 'service_role' with your actual service role name if different
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO postgres;

-- Also grant to authenticated users for certain operations
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
