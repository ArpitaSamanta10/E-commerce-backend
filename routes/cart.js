const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getCart);
router.post('/', authMiddleware, addToCart);
router.patch('/:id', authMiddleware, updateCartItem);
router.delete('/:id', authMiddleware, removeFromCart);

module.exports = router;
