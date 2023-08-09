-- CreateTable
CREATE TABLE "AmazonProduct" (
    "id" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asin" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "upc" TEXT,
    "model" TEXT,
    "mpn" TEXT,
    "numberOfSellersOnListing" INTEGER,
    "inStock" BOOLEAN,
    "isAmazonSellingOnListing" BOOLEAN,
    "currentListingPrice" DOUBLE PRECISION,
    "last30DayAvgListingPrice" DOUBLE PRECISION,
    "last90DayAvgListingPrice" DOUBLE PRECISION,
    "currentSalesPerMonth" DOUBLE PRECISION,
    "last30DayAvgSales" DOUBLE PRECISION,
    "last90DayAvgSales" DOUBLE PRECISION,
    "currentBSR" INTEGER,
    "last30DayAvgBSR" INTEGER,
    "last90DayAvgBSR" INTEGER,

    CONSTRAINT "AmazonProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmazonProduct_asin_key" ON "AmazonProduct"("asin");
