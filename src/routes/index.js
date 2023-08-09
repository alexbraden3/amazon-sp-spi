const router = require('express').Router();
const ProductApiValidator = require('middlewares/ProductApiValidator');
const ProductApiController = require('controllers/ProductApiController');

router.get(
  '/products/amazon',
  ProductApiValidator.getAmazonProducts,
  ProductApiController.getAmazonProducts,
);

module.exports = router;
