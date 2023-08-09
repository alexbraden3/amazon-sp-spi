const PrismaService = require('services/PrismaService');

class ProductApiController {
  static async getAmazonProducts(_req, res) {
    const products = await PrismaService.amazonProduct.findMany({});
    return res.status(200).json(products);
  }
}

module.exports = ProductApiController;
