const express = require('express');
const router = express.Router();

// Import shared utilities
const { getBaseClient, createAuthenticatedClient, createServiceClient } = require('../utils/supabase');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responses');
const { validateEmail, validatePassword } = require('../utils/validation');

const supabase = getBaseClient();

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  // Validation
  const emailError = validateEmail(email);
  if (emailError) {
    return sendError(res, emailError.message, emailError.statusCode);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendError(res, passwordError.message, passwordError.statusCode);
  }

  // Register user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || ''
      }
    }
  });

  if (error) {
    console.error('Registration error:', error);
    return sendError(res, error.message, 400);
  }

  // Create user profile in public.users table
  if (data.user) {
    // If session exists, use it for RLS compliance
    if (data.session) {
      const userSupabase = createAuthenticatedClient({ headers: { authorization: `Bearer ${data.session.access_token}` } });

      const { error: profileError } = await userSupabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
          avatar_url: null
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    } else {
      // If no session (email confirmation required), use service role
      const serviceSupabase = createServiceClient();

      const { error: profileError } = await serviceSupabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
          avatar_url: null
        });

      if (profileError) {
        console.error('Profile creation error (service role):', profileError);
      }
    }
  }

  sendSuccess(res, {
    user: {
      id: data.user?.id,
      email: data.user?.email,
      fullName: data.user?.user_metadata?.full_name
    },
    session: data.session
  }, 'Registration successful', 201);
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  const emailError = validateEmail(email);
  if (emailError) {
    return sendError(res, emailError.message, emailError.statusCode);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendError(res, passwordError.message, passwordError.statusCode);
  }

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login error:', error);
    return sendError(res, 'Invalid credentials', 401);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  sendSuccess(res, {
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: profile?.full_name || data.user.user_metadata?.full_name,
      avatarUrl: profile?.avatar_url
    },
    session: data.session
  }, 'Login successful');
}));

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Create a temporary client with the user's token
      const userSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );

      await userSupabase.auth.signOut();
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        showAuthorName: profile.show_author_name,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, avatarUrl, showAuthorName } = req.body;

    // Create a client with the user's token for RLS compliance
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (fullName !== undefined) {
      updates.full_name = fullName;
    }

    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl;
    }

    if (showAuthorName !== undefined) {
      updates.show_author_name = showAuthorName;
    }

    const { data, error } = await userSupabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        showAuthorName: user.show_author_name,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      message: 'Token refreshed successfully',
      session: data.session
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password
router.post('/update-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Create a client with the user's token
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );

    const { error } = await userSupabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error('Password update error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
