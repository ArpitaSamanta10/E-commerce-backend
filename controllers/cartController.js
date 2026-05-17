const { getSupabase } = require('../services/supabaseClient');

const CART_SELECT = '*, products(*)';

async function getCart(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cart')
      .select(CART_SELECT)
      .eq('user_id', req.user.id);
    if (error) return next(error);
    res.json({ items: data || [] });
  } catch (err) {
    next(err);
  }
}

async function addToCart(req, res, next) {
  try {
    const supabase = getSupabase();
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ message: 'product_id is required' });

    const { data: existing, error: findError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .maybeSingle();
    if (findError) return next(findError);

    if (existing) {
      const { data, error } = await supabase
        .from('cart')
        .update({ quantity: (existing.quantity || 0) + Number(quantity) })
        .eq('id', existing.id)
        .select(CART_SELECT)
        .single();
      if (error) return next(error);
      return res.json({ item: data, updated: true });
    }

    const { data, error } = await supabase
      .from('cart')
      .insert({ user_id: req.user.id, product_id, quantity: Number(quantity) })
      .select(CART_SELECT)
      .single();
    if (error) return next(error);
    res.status(201).json({ item: data });
  } catch (err) {
    next(err);
  }
}

async function updateCartItem(req, res, next) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);

    if (!qty || qty < 1) {
      const { error } = await supabase.from('cart').delete().eq('id', id).eq('user_id', req.user.id);
      if (error) return next(error);
      return res.json({ message: 'Removed' });
    }

    const { data, error } = await supabase
      .from('cart')
      .update({ quantity: qty })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select(CART_SELECT)
      .single();
    if (error) return next(error);
    res.json({ item: data });
  } catch (err) {
    next(err);
  }
}

async function removeFromCart(req, res, next) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase.from('cart').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) return next(error);
    res.json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart };
