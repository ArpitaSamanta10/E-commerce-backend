const { validateCoupon } = require('../services/couponService');
const { calculateShipping, estimateDeliveryDate } = require('../services/shippingService');

async function validateCouponCode(req, res) {
  try {
    const { code, subtotal = 0 } = req.body;
    const result = validateCoupon(code, Number(subtotal) || 0);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    const shipping = calculateShipping(Number(subtotal), result.freeShipping);
    return res.json({
      ...result,
      shippingCost: shipping.cost,
      estimatedDelivery: estimateDeliveryDate(),
    });
  } catch (err) {
    console.error('[validateCouponCode]', err);
    return res.status(500).json({ valid: false, message: 'Could not validate coupon' });
  }
}

async function previewCheckout(req, res) {
  try {
    const { subtotal = 0, couponCode } = req.body;
    const sub = Number(subtotal) || 0;
    let discount = 0;
    let freeShipping = false;
    let coupon = null;

    if (couponCode) {
      const result = validateCoupon(couponCode, sub);
      if (result.valid) {
        discount = result.discount || 0;
        freeShipping = result.freeShipping || false;
        coupon = result.code;
      }
    }

    const shipping = calculateShipping(sub, freeShipping);
    const tax = Math.round((sub - discount) * 0.08 * 100) / 100;
    const total = Math.max(0, sub - discount + shipping.cost + tax);

    return res.json({
      subtotal: sub,
      discount,
      coupon,
      shippingCost: shipping.cost,
      shippingLabel: shipping.label,
      tax,
      total,
      estimatedDelivery: estimateDeliveryDate(),
    });
  } catch (err) {
    console.error('[previewCheckout]', err);
    return res.status(500).json({ message: 'Checkout preview failed' });
  }
}

module.exports = { validateCouponCode, previewCheckout };
