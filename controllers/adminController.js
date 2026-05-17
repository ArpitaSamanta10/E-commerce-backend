const { getSupabase } = require('../services/supabaseClient');
const { formatSupabaseError } = require('../utils/supabaseError');

const ORDER_SELECT = '*, order_items(*, products(*))';
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 5);

async function dashboard(req, res, next) {
  try {
    const supabase = getSupabase();
    const [
      { data: users, error: usersError },
      { data: products, error: productsError },
      { data: orders, error: ordersError },
    ] = await Promise.all([
      supabase.from('profiles').select('id'),
      supabase.from('products').select('id, stock'),
      supabase.from('orders').select('total, status'),
    ]);

    if (usersError) return next(usersError);
    if (productsError) return next(productsError);
    if (ordersError) return next(ordersError);

    const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
    const lowStock = (products || []).filter(
      (p) => p.stock != null && Number(p.stock) <= LOW_STOCK_THRESHOLD
    ).length;

    res.json({
      totalUsers: (users || []).length,
      totalProducts: (products || []).length,
      totalOrders: (orders || []).length,
      totalRevenue,
      lowStockCount: lowStock,
    });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const supabase = getSupabase();
    const { status, search, sort = 'newest' } = req.query;
    let query = supabase.from('orders').select(ORDER_SELECT);

    if (status) query = query.eq('status', status);
    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (sort === 'total_desc') query = query.order('total', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return next(error);

    let orders = data || [];
    if (search) {
      const term = String(search).toLowerCase();
      orders = orders.filter(
        (o) =>
          String(o.id).includes(term) ||
          String(o.user_id || '').includes(term) ||
          (o.status || '').toLowerCase().includes(term)
      );
    }

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select(ORDER_SELECT)
      .single();

    if (error) return next(error);
    if (!data) return res.status(404).json({ message: 'Order not found' });
    res.json({ order: data });
  } catch (err) {
    next(err);
  }
}

async function listLowStockProducts(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .not('stock', 'is', null)
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true });

    if (error) {
      formatSupabaseError(error, 'listLowStockProducts');
      return res.json({ products: [] });
    }
    res.json({ products: data || [], threshold: LOW_STOCK_THRESHOLD });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  listOrders,
  updateOrderStatus,
  listLowStockProducts,
};
