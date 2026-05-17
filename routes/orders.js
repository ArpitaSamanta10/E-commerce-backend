const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getAllOrders } = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, createOrder);
router.get('/me', authMiddleware, getUserOrders);
router.get('/', authMiddleware, adminMiddleware, getAllOrders);

module.exports = router;
