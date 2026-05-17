const express = require('express');
const router = express.Router();
const { validateCouponCode, previewCheckout } = require('../controllers/checkoutController');

router.post('/validate-coupon', validateCouponCode);
router.post('/preview', previewCheckout);

module.exports = router;
