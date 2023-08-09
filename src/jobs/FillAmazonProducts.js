require('dotenv').config();
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '..'));
const PrismaService = require('services/PrismaService');
const SPService = require('services/SPService');

SPService.init();

const fillAmazonProducts = async () => {
  let pageToken = null;
  while (true) {
    const data = await SPService.searchCatalogItems('apple', pageToken);
    if (!data.pageToken || !data.result.length) {
      break;
    }
    pageToken = data.pageToken;
    console.log(pageToken);
    await PrismaService.amazonProduct.createMany({ data: data.result });
  }
};

const fillAdditionalData = async () => {
  let page = 0;
  const pageSize = 10;
  while (true) {
    const products = await PrismaService.amazonProduct.findMany({
      where: {
        numberOfSellersOnListing: null,
      },
      select: {
        asin: true,
      },
      skip: page * pageSize,
      take: pageSize,
    });
    if (products.length === 0) break;
    for (const product of products) {
      let data = {};
      let result = await SPService.getItemOffers(product.asin);
      data = result;
      console.log(product.asin, data);
      await PrismaService.amazonProduct.update({
        where: {
          asin: product.asin,
        },
        data,
      });
    }
  }

  await new Promise(resolve => setTimeout(resolve, 10000));
  fillAdditionalData();
};

fillAmazonProducts();
fillAdditionalData();
