const express = require('express');
const router = express.Router();
const { getWishlist, addWishlist, removeWishlist } = require('../controllers/wishlistController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getWishlist);
router.post('/', authMiddleware, addWishlist);
router.delete('/:id', authMiddleware, removeWishlist);

module.exports = router;
