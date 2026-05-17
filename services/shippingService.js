const FREE_SHIPPING_THRESHOLD = Number(process.env.FREE_SHIPPING_THRESHOLD || 50);
const STANDARD_SHIPPING = Number(process.env.STANDARD_SHIPPING_COST || 5.99);

function calculateShipping(subtotal, freeShipping = false) {
  if (freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD) {
    return { cost: 0, label: 'Free shipping' };
  }
  return { cost: STANDARD_SHIPPING, label: 'Standard shipping' };
}

function estimateDeliveryDate(fromDate = new Date(), businessDays = 5) {
  const date = new Date(fromDate);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date.toISOString().split('T')[0];
}

module.exports = { calculateShipping, estimateDeliveryDate };
