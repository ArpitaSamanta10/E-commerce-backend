function getCorsOptions() {
  const origins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const list = origins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production' || list.length === 0) {
    return { origin: true, credentials: true };
  }

  return {
    origin(origin, callback) {
      if (!origin || list.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

module.exports = { getCorsOptions };
