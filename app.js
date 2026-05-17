require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { initSupabase } = require('./services/supabaseClient');
const { getCorsOptions } = require('./config/cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const checkoutRoutes = require('./routes/checkout');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

try {
  initSupabase();
} catch (err) {
  console.error('[startup] Supabase init failed:', err.message);
}

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkout', checkoutRoutes);

app.use(errorHandler);

const basePort = Number(process.env.PORT || 4000);

function startServer(port) {
  const server = http.createServer(app);
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < basePort + 20) {
      startServer(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`Server running on port ${port} (${process.env.NODE_ENV || 'development'})`);
  });
}

startServer(basePort);
