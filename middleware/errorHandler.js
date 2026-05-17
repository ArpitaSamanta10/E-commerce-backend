const { formatSupabaseError } = require('../utils/supabaseError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const context = `${req.method} ${req.originalUrl}`;
  const formatted = formatSupabaseError(err, context);
  let status = err.status || err.statusCode || formatted?.status || 500;
  let message = formatted?.message || err.message || 'Internal Server Error';

  if (/already been registered/i.test(message)) {
    status = 409;
    message = 'An account with this email already exists.';
  }

  if (status >= 500) {
    console.error('[errorHandler]', context, status, message, err.stack || '');
    message = 'Something went wrong. Please try again later.';
  } else {
    console.warn('[errorHandler]', context, status, message);
  }

  res.status(status).json({ message });
}

module.exports = { errorHandler };
