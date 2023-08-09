const joi = require('joi');

class ProductApiValidator {
  static async getAmazonProducts(_req, _res, next) {
    return next();
  }
}

module.exports = ProductApiValidator;
