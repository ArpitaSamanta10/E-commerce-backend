function getCorsOptions() {
  // Build the list of allowed origins
  const origins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const configuredOrigins = origins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Default allowed origins (for development and fallback)
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4000',
    'https://e-commerce-frontend-nine-snowy.vercel.app',
  ];

  // Combine all origins
  const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

  if (process.env.NODE_ENV !== 'production') {
    // Development: allow all origins
    return { origin: true, credentials: true };
  }

  // Production: strict origin checking
  return {
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

module.exports = { getCorsOptions };
