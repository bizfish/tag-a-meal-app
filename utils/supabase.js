const { createClient } = require('@supabase/supabase-js');

/**
 * Create a Supabase client with optional user authentication
 * @param {string} authToken - Optional Bearer token for authenticated requests
 * @returns {Object} Supabase client instance
 */
function createSupabaseClient(authToken = null) {
  const config = {
    global: {}
  };

  if (authToken) {
    config.global.headers = {
      Authorization: `Bearer ${authToken}`
    };
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    config
  );
}

/**
 * Create an authenticated Supabase client from request headers
 * @param {Object} req - Express request object
 * @returns {Object} Supabase client instance
 */
function createAuthenticatedClient(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return createSupabaseClient(token);
}

/**
 * Create a service role Supabase client for admin operations
 * @returns {Object} Supabase client instance with service role key
 */
function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Get the base (anonymous) Supabase client
 * @returns {Object} Base Supabase client instance
 */
function getBaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

module.exports = {
  createSupabaseClient,
  createAuthenticatedClient,
  createServiceClient,
  getBaseClient
};
