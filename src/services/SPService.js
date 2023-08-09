const aws4 = require('aws4');
const axios = require('axios');
const dateFns = require('date-fns');
const qs = require('qs');
const StorageService = require('./StorageService');

class SPService {
  static accessToken = null;
  static refreshToken = null;
  static http = null;

  static init() {
    StorageService.init();
    this.accessToken = StorageService.get('accessToken');
    this.refreshToken = StorageService.get('refreshToken');

    this.http = axios.create({
      baseURL: 'https://sellingpartnerapi-na.amazon.com',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.http.interceptors.request.use(config => {
      aws4.sign(config);
      config.headers['x-amz-access-token'] = this.accessToken;
      delete config.headers.Host;
      delete config.hostname;
      delete config.path;
      return config;
    });

    this.http.interceptors.response.use(
      response => {
        return response;
      },
      async error => {
        if (error.response.status === 403) {
          await this.refreshTokens();
          error.config.headers['x-amz-access-token'] = this.accessToken;
          return await this.http.request(error.config);
        }
        throw error;
      },
    );
  }

  static async refreshTokens() {
    const config = {
      method: 'post',
      url: 'https://api.amazon.com/auth/o2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({
        // 'grant_type': 'client_credentials',
        // 'scope': 'sellingpartnerapi::migration',
        grant_type: 'refresh_token',
        refresh_token: process.env.AWS_SP_REFRESH_TOKEN,
        client_id: process.env.AWS_SP_APP_CLIENT_ID,
        client_secret: process.env.AWS_SP_APP_CLIENT_SECRET_ID,
      }),
    };
    const { data } = await axios(config);
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    StorageService.set('accessToken', this.accessToken);
    StorageService.set('refreshToken', this.refreshToken);
  }

  // https://developer-docs.amazon.com/sp-api/docs/catalog-items-api-v2022-04-01-reference#get-catalog2022-04-01itemsasin

  static async getCatalogItem(asin) {
    const { data } = await this.http.get(`/catalog/2022-04-01/items/${asin}`, {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        marketplaceIds: 'ATVPDKIKX0DER', // US
        includedData:
          'attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks,summaries',
      },
    });
    console.log(JSON.stringify(data));
    return data;
  }

  // https://developer-docs.amazon.com/sp-api/docs/product-pricing-api-v0-reference#get-productspricingv0competitiveprice

  static async getCompetitivePricing(asin) {
    const { data } = await this.http.get('/products/pricing/v0/competitivePrice', {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        MarketplaceId: 'ATVPDKIKX0DER', // US
        ItemType: 'Asin',
        Asins: asin,
      },
    });
    console.log(JSON.stringify(data));
    return data;
  }

  // ASIN
  // Product Category
  // Product Name as listed on Amazon
  // Product URL
  // Product Image
  // Product Image URL
  // Product UPC
  // Product Model (if available)
  // MPN
  // Current BSR (rank)

  // https://developer-docs.amazon.com/sp-api/docs/catalog-items-api-v2022-04-01-reference#get-catalog2022-04-01items

  static async searchCatalogItems(keywords, pageToken) {
    const { data } = await this.http.get('/catalog/2022-04-01/items', {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        marketplaceIds: 'ATVPDKIKX0DER', // US
        includedData:
          'attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks,summaries',
        keywords,
        pageToken,
      },
    });
    // console.log(JSON.stringify(data));
    const result = data.items.map(item => {
      const product = {
        asin: item.asin,
        category: item.salesRanks[0]?.displayGroupRanks[0]?.title,
        name: item.summaries[0]?.itemName,
        url: `https://www.amazon.com/dp/${item.asin}`,
        image: item.images[0]?.images[0]?.link,
        upc: item.identifiers[0].identifiers.find(id => id.identifierType === 'UPC')?.identifier,
        model: item.summaries[0]?.modelNumber,
        mpn: item.summaries[0]?.partNumber,
        currentBSR: item.salesRanks[0]?.displayGroupRanks[0]?.rank,
      };
      return product;
    });
    console.log(result);
    return {
      pageToken: data.pagination.nextToken,
      result,
    };
  }

  // Current Listing Price (Buy Box)
  // # of sellers currently on the listing
  // In stock (yes or no)
  // Is Amazon currently selling on the listing (yes or no)

  // https://developer-docs.amazon.com/sp-api/docs/product-pricing-api-v0-reference#get-productspricingv0itemsasinoffers

  static async getItemOffers(asin) {
    const { data } = await this.http.get(`/products/pricing/v0/items/${asin}/offers`, {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        MarketplaceId: 'ATVPDKIKX0DER', // US
        ItemCondition: 'New',
      },
    });
    const { Summary } = data.payload;
    const amazonListingPrice =
      Summary.LowestPrices?.find(price => price.fulfillmentChannel === 'Amazon')?.ListingPrice
        .Amount ?? 0;

    const result = {
      currentListingPrice: Summary.BuyBoxPrices?.[0]?.ListingPrice.Amount,
      numberOfSellersOnListing: Summary.TotalOfferCount,
      inStock: Summary.TotalOfferCount > 0,
      isAmazonSellingOnListing:
        Summary.LowestPrices &&
        !Summary.LowestPrices?.find(price => price.ListingPrice.Amount < amazonListingPrice),
    };
    console.log(result);
    return result;
  }

  // Current Sales Per Month
  // 30 day Avg Sales
  // 90 day Avg Sales

  // https://developer-docs.amazon.com/sp-api/docs/sales-api-v1-reference#get-salesv1ordermetrics

  static async getOrderMetrics(asin) {
    const result = {};

    let startDate = dateFns.formatISO(dateFns.subDays(new Date(), 30), { format: 'extended' });
    let endDate = dateFns.formatISO(new Date(), { format: 'extended' });
    let interval = `${startDate}--${endDate}`;
    let { data } = await this.http.get('/sales/v1/orderMetrics', {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        marketplaceIds: 'ATVPDKIKX0DER', // US
        asin,
        // https://developer-docs.amazon.com/sp-api/docs/sales-api-v1-reference#granularity
        granularity: 'Total',
        interval,
      },
    });
    console.log(JSON.stringify(data));
    result.last30DayAvgListingPrice = data.payload[0].averageUnitPrice.amount;
    result.last30DayTotalSales = data.payload[0].totalSales.amount;

    startDate = dateFns.formatISO(dateFns.subDays(new Date(), 90), { format: 'extended' });
    endDate = dateFns.formatISO(new Date(), { format: 'extended' });
    interval = `${startDate}--${endDate}`;
    ({ data } = await this.http.get('/sales/v1/orderMetrics', {
      params: {
        // https://spapi.cyou/en/guides/SellingPartnerApiDeveloperGuide.html#global-applications
        marketplaceIds: 'ATVPDKIKX0DER', // US
        asin,
        // https://developer-docs.amazon.com/sp-api/docs/sales-api-v1-reference#granularity
        granularity: 'Total',
        interval,
      },
    }));
    console.log(JSON.stringify(data));
    result.last90DayAvgListingPrice = data.payload[0].averageUnitPrice.amount;
    result.last90DayTotalSales = data.payload[0].totalSales.amount;

    console.log(result);

    return result;
  }

  // 30 day Avg Listing Price
  // 90 day Avg Listing Price
  // 30 day Avg BSR (rank)
  // 90 day Avg BSR (rank)
}

module.exports = SPService;
