const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getCollection,
  getCategories,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', getAllProducts);
router.get('/meta/categories', getCategories);
router.get('/meta/:type', getCollection);
router.get('/:id', getProduct);
router.post('/', authMiddleware, adminMiddleware, addProduct);
router.put('/:id', authMiddleware, adminMiddleware, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;
