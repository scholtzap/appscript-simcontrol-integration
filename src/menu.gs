// Version: 1.0.0
// Menu - Dynamic menu builder based on enabled integrations

/**
 * Menu module builds dynamic menus based on enabled integrations
 * Only shows menu items for integrations that are enabled in configuration
 */

/**
 * onOpen trigger - builds menu when spreadsheet opens
 * This is the main entry point called automatically by Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var config = Config.get();

  // Create main menu
  var menu = ui.createMenu('SimControl Integration');

  // Track if any integration is enabled
  var hasAnyIntegration = false;

  // Airtime Usage submenu
  if (config.integrations.airtime && config.integrations.airtime.enabled) {
    buildAirtimeMenu(menu);
    hasAnyIntegration = true;
  }

  // Data Usage submenu
  if (config.integrations.data && config.integrations.data.enabled) {
    buildDataMenu(menu, config);
    hasAnyIntegration = true;
  }

  // SIM Management submenu (always shown if at least one integration is enabled)
  if (hasAnyIntegration) {
    buildSIMMenu(menu, config);
  }

  // FOTA Web submenu
  if (config.integrations.fotaweb && config.integrations.fotaweb.enabled) {
    buildFotaMenu(menu);
    hasAnyIntegration = true;
  }

  // QR Codes submenu
  if (config.integrations.qrcode && config.integrations.qrcode.enabled) {
    buildQRMenu(menu);
    hasAnyIntegration = true;
  }

  // Utilities submenu (always shown if any integration is enabled)
  if (hasAnyIntegration) {
    buildUtilsMenu(menu);
  }

  // Add menu to UI
  menu.addToUi();
}


/**
 * Build Airtime Usage submenu
 */
function buildAirtimeMenu(menu) {
  var submenu = SpreadsheetApp.getUi().createMenu('📞 Airtime Usage');

  submenu.addItem('Download All Historical Data', 'fetchAirtimeUsage');
  submenu.addItem('Fetch Previous Day Only', 'fetchPreviousDayAirtime');
  submenu.addSeparator();
  submenu.addItem('Clear Airtime Sheet', 'clearAirtimeSheet');

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * Build Data Usage submenu
 */
function buildDataMenu(menu, config) {
  var submenu = SpreadsheetApp.getUi().createMenu('📊 Data Usage');

  submenu.addItem('Download All Historical Data', 'fetchDataUsage');
  submenu.addItem('Fetch Previous Day Only', 'fetchPreviousDayData');
  submenu.addSeparator();

  // Add recharges option if enabled
  if (config.integrations.recharges && config.integrations.recharges.enabled) {
    submenu.addItem('Fetch Recharges', 'fetchRecharges');
    submenu.addItem('Fetch Recent Recharges', 'fetchRecentRechargesToSheet');
    submenu.addSeparator();
  }

  // Add products option if enabled
  if (config.integrations.products && config.integrations.products.enabled) {
    submenu.addItem('Create Product Catalog', 'createRechargeProductSheet');
    submenu.addSeparator();
  }

  // Add high usage filter if enabled
  if (config.integrations.analytics && config.integrations.analytics.enabled &&
      config.integrations.analytics.highUsageFilter &&
      config.integrations.analytics.highUsageFilter.enabled) {
    submenu.addItem('Extract High Usage', 'extractHighUsage');
    submenu.addSeparator();
  }

  submenu.addItem('Clear Data Sheet', 'clearDataSheet');

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * Build SIM Management submenu
 */
function buildSIMMenu(menu, config) {
  var submenu = SpreadsheetApp.getUi().createMenu('📱 SIM Management');

  submenu.addItem('Update SIM Descriptions', 'updateSimDescriptionsFromSheet');
  submenu.addSeparator();

  // Add SIM details export if enabled
  if (config.integrations.simDetails && config.integrations.simDetails.enabled) {
    submenu.addItem('Export All SIM Details', 'fetchAllSIMDetailsToSheet');
  }

  // Add usage age analysis if enabled
  if (config.integrations.analytics && config.integrations.analytics.enabled &&
      config.integrations.analytics.usageAgeAnalysis &&
      config.integrations.analytics.usageAgeAnalysis.enabled) {
    submenu.addItem('Analyze Usage Age', 'analyzeUsageAge');
  }

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * Build FOTA Web submenu
 */
function buildFotaMenu(menu) {
  var submenu = SpreadsheetApp.getUi().createMenu('🌐 FOTA Web');

  submenu.addItem('Fetch Device Data', 'fetchFotaWebData');
  submenu.addItem('Get Company Info', 'getFotaCompanyInfo');
  submenu.addSeparator();
  submenu.addItem('Copy to Device-SIM Association', 'copyFOTAtoDeviceSIMAss');
  submenu.addSeparator();
  submenu.addItem('Clear FOTA Sheet', 'clearFotaSheet');
  submenu.addSeparator();
  submenu.addItem('Test FOTA API Key', 'testFotaWebApiKey');

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * Build QR Codes submenu
 */
function buildQRMenu(menu) {
  var submenu = SpreadsheetApp.getUi().createMenu('📲 QR Codes');

  submenu.addItem('Generate WhatsApp QR Codes', 'generateWhatsAppQRCodes');
  submenu.addSeparator();
  submenu.addItem('Clear QR Sheet', 'clearQRSheet');
  submenu.addItem('Delete QR Codes from Drive', 'deleteQRCodesFromDrive');

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * Build Utilities submenu
 */
function buildUtilsMenu(menu) {
  menu.addSeparator();

  var submenu = SpreadsheetApp.getUi().createMenu('🔧 Utilities');

  // Testing & Validation
  submenu.addItem('Run Full Test Suite', 'runFullTestSuite');
  submenu.addItem('Run Smoke Test', 'runSmokeTest');
  submenu.addSeparator();
  submenu.addItem('Test SimControl API Key', 'testSimcontrolApiKey');
  submenu.addItem('Check API Rate Limit', 'checkApiRateLimit');
  submenu.addSeparator();

  // Logging
  submenu.addItem('View Debug Log', 'showDebugLog');
  submenu.addItem('Clear Debug Log', 'clearDebugLog');
  submenu.addSeparator();

  // Triggers
  submenu.addItem('Setup Daily Triggers', 'setupDailyTriggers');
  submenu.addItem('List Active Triggers', 'listActiveTriggers');
  submenu.addItem('Delete All Triggers', 'deleteAllTriggers');
  submenu.addSeparator();

  // Job control
  submenu.addItem('Cancel Running Jobs', 'cancelExecution');
  submenu.addSeparator();

  // Script properties
  submenu.addItem('View Configuration', 'viewConfiguration');

  menu.addSubMenu(submenu);
  return menu;
}


/**
 * View current configuration
 * Shows a summary of enabled integrations
 */
function viewConfiguration() {
  var config = Config.get();
  var message = 'SimControl Integration Configuration\n\n';

  message += '=== Enabled Integrations ===\n';

  if (config.integrations.airtime && config.integrations.airtime.enabled) {
    message += '✓ Airtime Usage\n';
  }
  if (config.integrations.data && config.integrations.data.enabled) {
    message += '✓ Data Usage\n';
  }
  if (config.integrations.recharges && config.integrations.recharges.enabled) {
    message += '✓ Recharges\n';
  }
  if (config.integrations.products && config.integrations.products.enabled) {
    message += '✓ Products\n';
  }
  if (config.integrations.simDetails && config.integrations.simDetails.enabled) {
    message += '✓ SIM Details Export\n';
  }
  if (config.integrations.analytics && config.integrations.analytics.enabled) {
    message += '✓ Analytics\n';
    if (config.integrations.analytics.usageAgeAnalysis &&
        config.integrations.analytics.usageAgeAnalysis.enabled) {
      message += '  - Usage Age Analysis\n';
    }
    if (config.integrations.analytics.highUsageFilter &&
        config.integrations.analytics.highUsageFilter.enabled) {
      message += '  - High Usage Filter (>= ' +
                 config.integrations.analytics.highUsageFilter.threshold + ' MB)\n';
    }
  }
  if (config.integrations.fotaweb && config.integrations.fotaweb.enabled) {
    message += '✓ FOTA Web\n';
  }
  if (config.integrations.qrcode && config.integrations.qrcode.enabled) {
    message += '✓ QR Code Generator\n';
  }

  message += '\n=== Default Settings ===\n';
  message += 'Start Date: ' + config.defaults.startDate + '\n';
  message += 'Log Sheet: ' + config.defaults.logSheetName + '\n';

  SpreadsheetApp.getUi().alert(message);
}


/**
 * Show debug log
 * Navigates to the debug log sheet
 */
function showDebugLog() {
  Logger.showDebugLog();
}


/**
 * Clear debug log
 */
function clearDebugLog() {
  Logger.clearDebugLog();
}


/**
 * Check API rate limit
 * Shows current rate limit status from SimControl API
 */
function checkApiRateLimit() {
  var apiKey = Config.getApiKey('simcontrol');
  if (!apiKey) {
    SpreadsheetApp.getUi().alert('SimControl API key not configured');
    return;
  }

  try {
    var url = 'https://app.simcontrol.co.za/api/organisations/balance';
    var options = {
      method: 'get',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var headers = response.getAllHeaders();
    var limit = headers['x-ratelimit-limit'];
    var remaining = headers['x-ratelimit-remaining'];
    var resetUnix = headers['x-ratelimit-reset'];

    if (limit && remaining && resetUnix) {
      var resetTime = new Date(parseInt(resetUnix, 10) * 1000);
      var now = new Date();
      var timeDiffSec = Math.round((resetTime - now) / 1000);
      var minutes = Math.floor(timeDiffSec / 60);
      var seconds = timeDiffSec % 60;

      var msg = 'API Rate Limit Status\n\n' +
                'Used: ' + (limit - remaining) + ' of ' + limit + '\n' +
                'Remaining: ' + remaining + '\n' +
                'Resets at: ' + resetTime.toISOString() + '\n' +
                'Time until reset: ' + minutes + 'm ' + seconds + 's';

      Logger.log(msg);
      SpreadsheetApp.getUi().alert(msg);
    } else {
      var warning = 'Could not retrieve rate limit headers';
      Logger.log(warning);
      SpreadsheetApp.getUi().alert(warning);
    }

  } catch (e) {
    Logger.logError('checkApiRateLimit failed', e);
    SpreadsheetApp.getUi().alert('Error checking rate limit. See debug log.');
  }
}
