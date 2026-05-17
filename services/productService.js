const { formatSupabaseError } = require('../utils/supabaseError');

const TABLE = 'products';

function normalizeProduct(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    ...row,
    title: row.title ?? '',
    price: row.price != null ? Number(row.price) : 0,
    description: row.description ?? '',
    image: row.image ?? row.image_url ?? null,
    category: row.category ?? (row.category_id != null ? String(row.category_id) : null),
  };
}

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage, 10) || 12));
  const offset = (page - 1) * perPage;
  return { page, perPage, from: offset, to: offset + perPage - 1 };
}

function applyListFilters(builder, { search, category }) {
  let q = builder;

  const term = search != null ? String(search).trim() : '';
  if (term) {
    const safe = term.replace(/[%_,]/g, '');
    q = q.ilike('title', `%${safe}%`);
  }

  const cat = category != null ? String(category).trim() : '';
  if (cat) {
    const catId = parseInt(cat, 10);
    if (!Number.isNaN(catId)) {
      q = q.eq('category_id', catId);
    }
  }

  return q;
}

function isMissingColumnError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return code === '42703' || msg.includes('column') || msg.includes('does not exist');
}

function applySort(builder, sort) {
  if (sort === 'price_asc') return builder.order('price', { ascending: true });
  if (sort === 'price_desc') return builder.order('price', { ascending: false });
  if (sort === 'newest' || sort === 'created_desc' || !sort) {
    return builder.order('created_at', { ascending: false });
  }
  return builder.order('created_at', { ascending: false });
}

async function runQuery(attempt) {
  const result = await attempt();
  if (!result.error) return result;
  if (isMissingColumnError(result.error)) return null;
  return result;
}

async function listProducts(supabase, query = {}) {
  const { page, perPage, from, to } = parsePagination(query);
  const { search, category, sort } = query;

  const attempts = [
    () => {
      let q = supabase.from(TABLE).select('*', { count: 'exact' });
      q = applyListFilters(q, { search, category });
      q = applySort(q, sort);
      return q.range(from, to);
    },
    () => {
      let q = supabase.from(TABLE).select('*', { count: 'exact' });
      q = applyListFilters(q, { search, category });
      return q.order('id', { ascending: false }).range(from, to);
    },
    () => supabase.from(TABLE).select('*', { count: 'exact' }).order('id', { ascending: false }).range(from, to),
  ];

  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    const result = await attempts[i]();
    if (!result.error) {
      return {
        products: (result.data || []).map(normalizeProduct).filter(Boolean),
        page,
        perPage,
        total: result.count ?? (result.data || []).length,
      };
    }
    lastError = result.error;
    console.warn(`[productService] listProducts attempt ${i + 1} failed:`, result.error.message);
  }

  const formatted = formatSupabaseError(lastError, 'listProducts');
  const err = new Error(formatted?.message || 'Failed to fetch products');
  err.status = formatted?.status || 503;
  err.code = formatted?.code;
  throw err;
}

async function getCategories(supabase) {
  const { data: fromTable, error: tableError } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (!tableError && Array.isArray(fromTable) && fromTable.length > 0) {
    return { categories: fromTable };
  }

  if (tableError && tableError.code !== 'PGRST205' && tableError.code !== '42P01') {
    console.warn('[productService] categories table:', tableError.message);
  }

  const { data: products, error } = await supabase.from(TABLE).select('category_id');
  if (error) {
    formatSupabaseError(error, 'getCategories');
    return { categories: [] };
  }

  const seen = new Set();
  const categories = [];
  for (const p of products || []) {
    if (p.category_id == null) continue;
    const id = String(p.category_id);
    if (seen.has(id)) continue;
    seen.add(id);
    categories.push({ id, name: `Category ${id}` });
  }

  return { categories };
}

async function getProductById(supabase, id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) {
    const formatted = formatSupabaseError(error, 'getProductById');
    const err = new Error(formatted?.message || 'Product not found');
    err.status = formatted?.status || 404;
    throw err;
  }
  if (!data) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  return normalizeProduct(data);
}

function mapPayloadToRow(body = {}) {
  const payload = { ...body };
  if (payload.image != null && payload.image_url == null) {
    payload.image_url = payload.image;
  }
  delete payload.image;
  delete payload.category;
  return payload;
}

async function createProduct(supabase, body) {
  const payload = mapPayloadToRow(body);
  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) {
    const formatted = formatSupabaseError(error, 'createProduct');
    const err = new Error(formatted?.message || 'Failed to create product');
    err.status = formatted?.status || 400;
    throw err;
  }
  return normalizeProduct(data);
}

async function updateProduct(supabase, id, body) {
  const payload = mapPayloadToRow(body);
  const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select('*').single();
  if (error) {
    const formatted = formatSupabaseError(error, 'updateProduct');
    const err = new Error(formatted?.message || 'Failed to update product');
    err.status = formatted?.status || 400;
    throw err;
  }
  return normalizeProduct(data);
}

async function deleteProduct(supabase, id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    const formatted = formatSupabaseError(error, 'deleteProduct');
    const err = new Error(formatted?.message || 'Failed to delete product');
    err.status = formatted?.status || 400;
    throw err;
  }
}

async function listCollection(supabase, { type = 'featured', sort, limit = 8 } = {}) {
  const perPage = Math.min(24, Math.max(1, Number(limit) || 8));
  const from = 0;
  const to = perPage - 1;

  const columnQueries =
    type === 'trending'
      ? [
          () =>
            supabase
              .from(TABLE)
              .select('*')
              .eq('trending', true)
              .order('sales_count', { ascending: false })
              .range(from, to),
          () =>
            supabase.from(TABLE).select('*').order('sales_count', { ascending: false }).range(from, to),
          () =>
            supabase.from(TABLE).select('*').order('rating', { ascending: false }).range(from, to),
          () =>
            supabase.from(TABLE).select('*').order('rating_count', { ascending: false }).range(from, to),
        ]
      : [
          () =>
            supabase
              .from(TABLE)
              .select('*')
              .eq('featured', true)
              .order('created_at', { ascending: false })
              .range(from, to),
          () =>
            supabase.from(TABLE).select('*').eq('featured', true).order('id', { ascending: false }).range(from, to),
          () => supabase.from(TABLE).select('*').eq('featured', true).range(from, to),
        ];

  for (let i = 0; i < columnQueries.length; i++) {
    const result = await runQuery(columnQueries[i]);
    if (!result) {
      console.warn(`[productService] listCollection(${type}) attempt ${i + 1}: optional column unavailable`);
      continue;
    }
    if (result.error) {
      console.warn(`[productService] listCollection(${type}) attempt ${i + 1}:`, result.error.message);
      continue;
    }
    const rows = result.data || [];
    if (rows.length > 0) {
      return { products: rows.map(normalizeProduct).filter(Boolean) };
    }
  }

  const fallbackSort = sort || (type === 'trending' ? 'price_desc' : 'newest');
  try {
    return await listProducts(supabase, { page: 1, perPage, sort: fallbackSort });
  } catch (err) {
    console.error(`[productService] listCollection(${type}) fallback failed:`, err.message);
    return { products: [], page: 1, perPage, total: 0 };
  }
}

async function verifyProductsTable(supabase) {
  const { error } = await supabase.from(TABLE).select('id').limit(1);
  if (error) {
    formatSupabaseError(error, 'verifyProductsTable');
    return false;
  }
  return true;
}

module.exports = {
  normalizeProduct,
  listProducts,
  listCollection,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  verifyProductsTable,
};
