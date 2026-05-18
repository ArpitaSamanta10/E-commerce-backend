const { getSupabase } = require('../services/supabaseClient');
const { validateCoupon } = require('../services/couponService');
const { calculateShipping, estimateDeliveryDate } = require('../services/shippingService');

const ORDER_SELECT = '*, order_items(*, products(*))';

async function decrementStock(supabase, items) {
  for (const item of items) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .maybeSingle();
      if (product?.stock == null) continue;
      const next = Math.max(0, Number(product.stock) - Number(item.quantity || 1));
      await supabase.from('products').update({ stock: next }).eq('id', item.product_id);
    } catch (e) {
      console.warn('[decrementStock]', item.product_id, e.message);
    }
  }
}

async function createOrder(req, res, next) {
  try {
    const supabase = getSupabase();
    let { items, total, shipping, couponCode, shippingCost, discount } = req.body;

    if (!items || !items.length) {
      const { data: cartItems, error: cartError } = await supabase
        .from('cart')
        .select('*, products(*)')
        .eq('user_id', req.user.id);
      if (cartError) return next(cartError);
      if (!cartItems?.length) {
        return res.status(400).json({ message: 'Cart is empty' });
      }
      items = cartItems.map((row) => ({
        product_id: row.product_id,
        quantity: row.quantity || 1,
        price: row.products?.price ?? row.price ?? 0,
      }));
    }

    if (!items?.length) {
      return res.status(400).json({ message: 'No items to order' });
    }

    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1),
      0
    );

    let appliedDiscount = Number(discount) || 0;
    let freeShipping = false;
    if (couponCode) {
      const coupon = validateCoupon(couponCode, subtotal);
      if (coupon.valid) {
        appliedDiscount = coupon.discount || 0;
        freeShipping = coupon.freeShipping || false;
      }
    }

    const shippingCalc = calculateShipping(subtotal, freeShipping);
    const finalShipping =
      shippingCost != null ? Number(shippingCost) : shippingCalc.cost;
    const tax = Math.round((subtotal - appliedDiscount) * 0.08 * 100) / 100;
    const computedTotal =
      total ?? Math.max(0, subtotal - appliedDiscount + finalShipping + tax);

    const deliveryDate = estimateDeliveryDate();

    const orderPayload = {
      user_id: req.user.id,
      full_name: req.body.full_name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      country: req.body.country || '',
      pincode: req.body.pincode || '',
      total_amount: computedTotal,
      payment_method: req.body.payment_method || 'card',
      payment_status: 'pending',
      order_status: 'processing',
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();
    if (orderError) return next(orderError);

    const itemsPayload = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity || 1,
      price: i.price ?? 0,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return next(itemsError);
    }

    await decrementStock(supabase, itemsPayload);
    await supabase.from('cart').delete().eq('user_id', req.user.id);

    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', order.id)
      .single();
    if (fetchError) return res.status(201).json({ order });
    res.status(201).json({ order: fullOrder });
  } catch (err) {
    next(err);
  }
}

async function getUserOrders(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return next(error);
    res.json({ orders: data || [] });
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false });
    if (error) return next(error);
    res.json({ orders: data || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getUserOrders, getAllOrders };
