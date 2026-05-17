const { getSupabase } = require('../services/supabaseClient');
const productService = require('../services/productService');

function getClient(res) {
  try {
    return getSupabase();
  } catch (err) {
    console.error('[products] Supabase client unavailable:', err.message);
    res.status(503).json({
      products: [],
      categories: [],
      product: null,
      message: 'Database is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
    return null;
  }
}

function emptyListResponse(res, message, status = 200) {
  return res.status(status).json({
    products: [],
    page: 1,
    perPage: 12,
    total: 0,
    message: message || undefined,
  });
}

async function getAllProducts(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const result = await productService.listProducts(supabase, req.query);
    return res.json({
      products: result.products,
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    });
  } catch (err) {
    console.error('[getAllProducts]', err.message);
    return emptyListResponse(res, err.message, err.status === 503 ? 503 : 200);
  }
}

async function getCollection(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  const type = req.params.type || 'featured';
  if (!['featured', 'trending'].includes(type)) {
    return res.status(404).json({ products: [], type, message: 'Unknown collection' });
  }

  try {
    const result = await productService.listCollection(supabase, {
      type,
      limit: Number(req.query.limit) || 8,
    });
    const products = Array.isArray(result?.products) ? result.products : [];
    return res.json({ products, type });
  } catch (err) {
    console.error(`[getCollection:${type}]`, err.message, err.code || '');
    return res.status(200).json({
      products: [],
      type,
      message: err.message || 'Could not load collection',
    });
  }
}

async function getCategories(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const result = await productService.getCategories(supabase);
    return res.json({ categories: result.categories || [] });
  } catch (err) {
    console.error('[getCategories]', err.message);
    return res.json({ categories: [], message: err.message });
  }
}

async function getProduct(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const product = await productService.getProductById(supabase, req.params.id);
    return res.json({ product });
  } catch (err) {
    console.error('[getProduct]', err.message);
    return res.status(err.status || 404).json({ product: null, message: err.message });
  }
}

async function addProduct(req, res, next) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const product = await productService.createProduct(supabase, req.body);
    return res.status(201).json({ product });
  } catch (err) {
    console.error('[addProduct]', err.message);
    return res.status(err.status || 400).json({ message: err.message, product: null });
  }
}

async function updateProduct(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const product = await productService.updateProduct(supabase, req.params.id, req.body);
    return res.json({ product });
  } catch (err) {
    console.error('[updateProduct]', err.message);
    return res.status(err.status || 400).json({ message: err.message, product: null });
  }
}

async function deleteProduct(req, res) {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    await productService.deleteProduct(supabase, req.params.id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[deleteProduct]', err.message);
    return res.status(err.status || 400).json({ message: err.message });
  }
}

module.exports = {
  getAllProducts,
  getCollection,
  getCategories,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
};
