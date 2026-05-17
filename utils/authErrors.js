function mapAuthError(error) {
  if (!error) return { status: 500, message: 'Authentication failed' };

  const message = error.message || 'Authentication failed';
  const code = error.code || '';
  const status = error.status || error.statusCode;

  if (
    code === 'email_exists' ||
    /already been registered/i.test(message) ||
    /user already registered/i.test(message)
  ) {
    return { status: 409, message: 'An account with this email already exists.' };
  }

  if (/invalid email/i.test(message) || code === 'validation_failed') {
    return { status: 400, message: 'Please enter a valid email address.' };
  }

  if (/password/i.test(message) && /weak|short|least/i.test(message)) {
    return { status: 400, message };
  }

  if (status >= 400 && status < 600) {
    return { status, message };
  }

  return { status: 400, message };
}

function validateSignupInput(body = {}) {
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'A valid email address is required.';
  }
  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  if (!full_name) {
    errors.full_name = 'Full name is required.';
  }

  return { email, password, full_name, errors, valid: Object.keys(errors).length === 0 };
}

module.exports = { mapAuthError, validateSignupInput };
