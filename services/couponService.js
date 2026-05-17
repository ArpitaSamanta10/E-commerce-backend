/** Demo coupon codes — replace with DB table in production */
const COUPONS = {
  SAVE10: { type: 'percent', value: 10, minSubtotal: 0 },
  SAVE20: { type: 'percent', value: 20, minSubtotal: 50 },
  FLAT15: { type: 'fixed', value: 15, minSubtotal: 30 },
  FREESHIP: { type: 'shipping', value: 0, minSubtotal: 0 },
};

function validateCoupon(code, subtotal = 0) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Enter a coupon code' };
  }
  const key = code.trim().toUpperCase();
  const coupon = COUPONS[key];
  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      message: `Minimum order ${coupon.minSubtotal} required for this code`,
    };
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
  } else if (coupon.type === 'fixed') {
    discount = Math.min(subtotal, coupon.value);
  }

  return {
    valid: true,
    code: key,
    type: coupon.type,
    discount,
    freeShipping: coupon.type === 'shipping',
    message: `Coupon ${key} applied`,
  };
}

module.exports = { validateCoupon, COUPONS };
