const jwt = require('jsonwebtoken');
const { getSupabase } = require('../services/supabaseClient');
const profileService = require('../services/profileService');
const { mapAuthError, validateSignupInput } = require('../utils/authErrors');

function getAuthClient(res) {
  try {
    return getSupabase();
  } catch (err) {
    console.error('[auth] Supabase unavailable:', err.message);
    res.status(503).json({ message: 'Authentication service is not configured.' });
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
    created_at: user.created_at,
  };
}

async function signup(req, res) {
  const supabase = getAuthClient(res);
  if (!supabase) return;

  const { email, password, full_name, errors, valid } = validateSignupInput(req.body);
  if (!valid) {
    console.warn('[signup] validation failed:', errors);
    return res.status(400).json({ message: 'Invalid signup data.', errors });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'user' },
    });

    if (error) {
      const mapped = mapAuthError(error);
      console.error('[signup] createUser failed:', error.message, error.code || '');
      return res.status(mapped.status).json({ message: mapped.message });
    }

    const user = data?.user;
    if (!user) {
      console.error('[signup] createUser returned no user');
      return res.status(500).json({ message: 'Account could not be created. Please try again.' });
    }

    const profileResult = await profileService.ensureProfile(supabase, {
      id: user.id,
      email: user.email || email,
      full_name,
    });

    if (profileResult.error) {
      console.warn('[signup] profile not saved:', profileResult.error);
    }

    return res.status(201).json({
      user: sanitizeUser(user),
      profile: profileResult.profile || null,
    });
  } catch (err) {
    console.error('[signup] unexpected error:', err.message, err.stack);
    return res.status(500).json({ message: 'Signup failed. Please try again later.' });
  }
}

async function login(req, res) {
  const supabase = getAuthClient(res);
  if (!supabase) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('[login] JWT_SECRET is not set');
    return res.status(503).json({ message: 'Authentication is not configured on the server.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.warn('[login] failed:', error.message);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = data.user;
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: (user.user_metadata && user.user_metadata.role) || 'user',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[login] unexpected error:', err.message);
    return res.status(500).json({ message: 'Login failed. Please try again later.' });
  }
}

async function me(req, res) {
  const supabase = getAuthClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(req.user.id);
    if (error) {
      const mapped = mapAuthError(error);
      console.warn('[me] getUserById failed:', error.message);
      return res.status(mapped.status).json({ message: mapped.message });
    }
    return res.json({ user: sanitizeUser(data?.user) });
  } catch (err) {
    console.error('[me] unexpected error:', err.message);
    return res.status(500).json({ message: 'Could not load user profile.' });
  }
}

module.exports = { signup, login, me };
