const express = require('express');
const router = express.Router();
const {
  dashboard,
  listOrders,
  updateOrderStatus,
  listLowStockProducts,
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, adminMiddleware, dashboard);
router.get('/orders', authMiddleware, adminMiddleware, listOrders);
router.patch('/orders/:id', authMiddleware, adminMiddleware, updateOrderStatus);
router.get('/products/low-stock', authMiddleware, adminMiddleware, listLowStockProducts);

module.exports = router;
