// Version: 1.0.0
// SimControlProducts - Product catalog management

/**
 * SimControlProducts module provides functions for fetching and managing
 * recharge product catalogs from SimControl API
 */

/**
 * Get products by network ID and type
 * @param {number} networkId - Network ID (e.g., 10, 11)
 * @param {string} productType - Product type (DATA, AIRTIME, SMS)
 * @returns {Array} Array of product objects
 */
function getProductsByNetwork(networkId, productType) {
  Logger.log('Fetching products for network ID: ' + networkId + ', type: ' + productType);

  try {
    var params = {
      network_id: networkId,
      product_type: productType,
      page_size: 100
    };

    var products = SimControlAPI.callWithPagination('/products', params);

    Logger.log('✅ Retrieved ' + products.length + ' products for network ' + networkId);
    return products;

  } catch (e) {
    Logger.logError('Failed to fetch products for network ' + networkId, e);
    return [];
  }
}


/**
 * Create or refresh product catalog sheet
 */
function createRechargeProductSheet() {
  // Get configuration
  var config = Config.get();
  var productConfig = config.integrations.products;

  if (!productConfig || !productConfig.enabled) {
    Logger.log('Products integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Product catalog is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = productConfig.sheetName;
  var networkIds = productConfig.networkIds || [10, 11]; // Default to networks 10, 11
  var productType = productConfig.productType || 'DATA'; // Default to DATA

  Logger.log('=== Creating Product Catalog ===');
  Logger.log('Sheet: ' + sheetName);
  Logger.log('Network IDs: ' + networkIds.join(', '));
  Logger.log('Product Type: ' + productType);

  // Get or create sheet
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Fetch products for all specified networks
  var allProducts = [];

  for (var i = 0; i < networkIds.length; i++) {
    var networkId = networkIds[i];
    Logger.log('Fetching products for network ID: ' + networkId);

    var products = getProductsByNetwork(networkId, productType);
    allProducts = allProducts.concat(products);
  }

  if (allProducts.length === 0) {
    Logger.log('No products found for specified networks and product type');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'No ' + productType + ' products found for specified networks',
      'ℹ️ Info',
      5
    );
    return;
  }

  // Clear sheet and prepare for new data
  sheet.clear();

  // Extract headers from first product object
  var headers = Object.keys(allProducts[0]);
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Write product data
  var rows = allProducts.map(function(product) {
    return headers.map(function(header) {
      var val = product[header];
      // Serialize nested objects to JSON
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  Logger.log('✅ Wrote ' + rows.length + ' products to ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Loaded ' + rows.length + ' ' + productType + ' products',
    '✅ Done',
    5
  );
}


/**
 * Refresh product catalog (alias for createRechargeProductSheet)
 */
function refreshProductCatalog() {
  createRechargeProductSheet();
}


/**
 * Clear products sheet
 */
function clearProductsSheet() {
  var config = Config.get();
  var productConfig = config.integrations.products;

  if (!productConfig || !productConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Products integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = productConfig.sheetName;
  SheetHelpers.clearEntireSheet(sheetName);

  Logger.log('Products sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('Products sheet cleared!', '✅ Done', 5);
}
