const { getSupabase } = require('../services/supabaseClient');

const WISHLIST_SELECT = '*, products(*)';

async function getWishlist(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('wishlist')
      .select(WISHLIST_SELECT)
      .eq('user_id', req.user.id);
    if (error) return next(error);
    res.json({ items: data || [] });
  } catch (err) {
    next(err);
  }
}

async function addWishlist(req, res, next) {
  try {
    const supabase = getSupabase();
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ message: 'product_id is required' });

    const { data: existing, error: findError } = await supabase
      .from('wishlist')
      .select(WISHLIST_SELECT)
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .maybeSingle();
    if (findError) return next(findError);
    if (existing) {
      return res.status(200).json({ item: existing, duplicate: true });
    }

    const { data, error } = await supabase
      .from('wishlist')
      .insert({ user_id: req.user.id, product_id })
      .select(WISHLIST_SELECT)
      .single();
    if (error) return next(error);
    res.status(201).json({ item: data });
  } catch (err) {
    next(err);
  }
}

async function removeWishlist(req, res, next) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase.from('wishlist').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) return next(error);
    res.json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWishlist, addWishlist, removeWishlist };
