// Version: 1.0.0
// SimControlAnalytics - Usage analysis and filtering

/**
 * SimControlAnalytics module provides analytics functions for:
 * - Usage age analysis (days since last usage)
 * - High usage filtering (SIMs exceeding threshold)
 * - Inactive SIM identification
 */

/**
 * Generate SIM usage summary / Analyze usage age
 * Creates a summary showing when each SIM last had usage and how many days ago
 */
function analyzeUsageAge() {
  // Get configuration
  var config = Config.get();
  var analyticsConfig = config.integrations.analytics;

  if (!analyticsConfig || !analyticsConfig.enabled ||
      !analyticsConfig.usageAgeAnalysis || !analyticsConfig.usageAgeAnalysis.enabled) {
    Logger.log('Usage age analysis is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Usage age analysis is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  Logger.log('=== Analyzing Usage Age ===');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheetName = analyticsConfig.usageAgeAnalysis.sheetName;

  // Get data integration config to find the usage sheet
  var dataConfig = config.integrations.data;
  if (!dataConfig || !dataConfig.enabled) {
    Logger.logError('Data integration must be enabled for usage age analysis');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Data integration is not enabled. Cannot analyze usage age.',
      '❌ Error',
      5
    );
    return;
  }

  var usageSheetName = dataConfig.sheetName;
  var usageSheet = ss.getSheetByName(usageSheetName);

  if (!usageSheet) {
    Logger.logError('Usage sheet not found: ' + usageSheetName);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Usage sheet not found: ' + usageSheetName,
      '❌ Error',
      5
    );
    return;
  }

  // Get or create summary sheet
  var summarySheet = ss.getSheetByName(summarySheetName);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(summarySheetName);
    summarySheet.appendRow(['MSISDN', 'Status', 'Last Usage Date', 'Days Since Last Usage']);
    summarySheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  } else {
    // Clear data rows only, preserve header
    if (summarySheet.getLastRow() > 1) {
      summarySheet.getRange(2, 1, summarySheet.getLastRow() - 1, 4).clearContent();
    }
  }

  // Get all SIMs
  var sims = getAllSIMs();
  if (!sims || sims.length === 0) {
    Logger.logError('No SIMs retrieved for usage age analysis');
    return;
  }

  Logger.log('Analyzing usage age for ' + sims.length + ' SIMs');

  // Get usage data
  var usageData = usageSheet.getDataRange().getValues();
  var header = usageData[0];
  var dateRows = usageData.slice(1);
  var today = new Date();

  var results = [];

  for (var i = 0; i < sims.length; i++) {
    var sim = sims[i];
    var id = sim.msisdn || sim.iccid || sim.imsi;
    var status = sim.active ? 'ACTIVE' : 'SUSPENDED';

    // Find column for this SIM
    var colIndex = header.indexOf(id);
    var lastUsedDate = null;

    if (colIndex !== -1) {
      // Scan from bottom to top to find last non-zero usage
      for (var j = dateRows.length - 1; j >= 0; j--) {
        var date = dateRows[j][0];
        var value = dateRows[j][colIndex];
        if (value > 0) {
          lastUsedDate = date;
          break;
        }
      }
    }

    var daysAgo = '';
    var formattedDate = '';

    if (lastUsedDate) {
      var lastDate = lastUsedDate instanceof Date ? lastUsedDate : new Date(lastUsedDate);
      var diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      daysAgo = diff;
      formattedDate = Utilities.formatDate(lastDate, 'GMT', 'yyyy-MM-dd');
    }

    results.push([id, status, formattedDate, daysAgo]);
  }

  // Write results to sheet
  if (results.length > 0) {
    summarySheet.getRange(2, 1, results.length, 4).setValues(results);
  }

  Logger.log('✅ Usage age analysis complete for ' + results.length + ' SIMs');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Analyzed usage age for ' + results.length + ' SIMs',
    '✅ Done',
    5
  );
}


/**
 * Alias for analyzeUsageAge
 */
function generateSIMUsageSummary() {
  analyzeUsageAge();
}


/**
 * Extract high usage data (usage >= threshold)
 * Creates a filtered view of SIMs that exceeded the configured threshold
 */
function extractHighUsage() {
  // Get configuration
  var config = Config.get();
  var analyticsConfig = config.integrations.analytics;

  if (!analyticsConfig || !analyticsConfig.enabled ||
      !analyticsConfig.highUsageFilter || !analyticsConfig.highUsageFilter.enabled) {
    Logger.log('High usage filter is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'High usage filter is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  Logger.log('=== Extracting High Usage Data ===');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var outputSheetName = analyticsConfig.highUsageFilter.sheetName;
  var threshold = analyticsConfig.highUsageFilter.threshold || 1500;

  // Get data integration config to find the usage sheet
  var dataConfig = config.integrations.data;
  if (!dataConfig || !dataConfig.enabled) {
    Logger.logError('Data integration must be enabled for high usage filter');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Data integration is not enabled. Cannot filter high usage.',
      '❌ Error',
      5
    );
    return;
  }

  var usageSheetName = dataConfig.sheetName;
  var sourceSheet = ss.getSheetByName(usageSheetName);

  if (!sourceSheet) {
    Logger.logError('Usage sheet not found: ' + usageSheetName);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Usage sheet not found: ' + usageSheetName,
      '❌ Error',
      5
    );
    return;
  }

  Logger.log('Filtering data >= ' + threshold + ' MB from ' + usageSheetName);

  // Get data bounds
  var lastRow = sourceSheet.getLastRow();
  var lastCol = sourceSheet.getLastColumn();

  if (lastRow < 2 || lastCol < 2) {
    Logger.log('No data found in usage sheet');
    SpreadsheetApp.getActiveSpreadsheet().toast('No data to filter', 'ℹ️ Info', 5);
    return;
  }

  // Read data
  var dates = sourceSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var headers = sourceSheet.getRange(1, 2, 1, lastCol - 1).getValues()[0];
  var values = sourceSheet.getRange(2, 2, lastRow - 1, lastCol - 1).getValues();

  var output = [];

  // Scan for high usage
  for (var c = 0; c < headers.length; c++) {
    var line = headers[c];
    for (var r = 0; r < dates.length; r++) {
      var val = values[r][c];
      if (typeof val === 'number' && val >= threshold) {
        output.push([dates[r][0], line, val]);
      }
    }
  }

  Logger.log('Found ' + output.length + ' high usage entries');

  if (output.length === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'No usage >= ' + threshold + ' MB found',
      'ℹ️ Info',
      5
    );
    return;
  }

  // Sort by Line (asc), then Date (asc)
  output.sort(function(a, b) {
    // Line compare as string
    var la = String(a[1]);
    var lb = String(b[1]);
    if (la < lb) return -1;
    if (la > lb) return 1;

    // Date compare
    var da = (a[0] instanceof Date) ? a[0].getTime() : new Date(a[0]).getTime();
    var db = (b[0] instanceof Date) ? b[0].getTime() : new Date(b[0]).getTime();
    return da - db;
  });

  // Delete old sheet if exists
  var oldSheet = ss.getSheetByName(outputSheetName);
  if (oldSheet) {
    ss.deleteSheet(oldSheet);
  }

  // Create new output sheet
  var outSheet = ss.insertSheet(outputSheetName);
  outSheet.getRange(1, 1, 1, 3).setValues([['Date', 'Line', 'Value (MB)']]);
  outSheet.getRange(1, 1, 1, 3).setFontWeight('bold');

  if (output.length > 0) {
    outSheet.getRange(2, 1, output.length, 3).setValues(output);

    // Format date column
    outSheet.getRange(2, 1, output.length, 1).setNumberFormat('yyyy-mm-dd');

    // Create filter
    outSheet.getRange(1, 1, output.length + 1, 3).createFilter();
  }

  Logger.log('✅ High usage filter complete: ' + output.length + ' entries');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Found ' + output.length + ' high usage entries (>= ' + threshold + ' MB)',
    '✅ Done',
    5
  );
}


/**
 * Identify inactive SIMs (no usage for X days)
 * @param {number} days - Number of days threshold (default 30)
 * @returns {Array} Array of inactive SIM MSISDNs
 */
function identifyInactiveSIMs(days) {
  days = days || 30;

  Logger.log('Identifying SIMs with no usage for ' + days + ' days');

  // Get configuration
  var config = Config.get();
  var analyticsConfig = config.integrations.analytics;

  if (!analyticsConfig || !analyticsConfig.enabled ||
      !analyticsConfig.usageAgeAnalysis || !analyticsConfig.usageAgeAnalysis.enabled) {
    Logger.log('Usage age analysis is not enabled');
    return [];
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheetName = analyticsConfig.usageAgeAnalysis.sheetName;
  var summarySheet = ss.getSheetByName(summarySheetName);

  if (!summarySheet) {
    Logger.log('Usage age analysis sheet not found. Run analyzeUsageAge() first.');
    return [];
  }

  // Read data from summary sheet
  var data = summarySheet.getDataRange().getValues();
  var inactiveSIMs = [];

  // Skip header row
  for (var i = 1; i < data.length; i++) {
    var msisdn = data[i][0];
    var daysAgo = data[i][3];

    if (typeof daysAgo === 'number' && daysAgo >= days) {
      inactiveSIMs.push(msisdn);
    }
  }

  Logger.log('Found ' + inactiveSIMs.length + ' inactive SIMs (>= ' + days + ' days)');
  return inactiveSIMs;
}


/**
 * Clear usage age analysis sheet
 */
function clearUsageAgeSheet() {
  var config = Config.get();
  var analyticsConfig = config.integrations.analytics;

  if (!analyticsConfig || !analyticsConfig.usageAgeAnalysis) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Usage age analysis is not configured',
      '⚠️ Not Configured',
      5
    );
    return;
  }

  var sheetName = analyticsConfig.usageAgeAnalysis.sheetName;
  SheetHelpers.clearSheetData(sheetName);

  Logger.log('Usage age analysis sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('Usage age sheet cleared!', '✅ Done', 5);
}


/**
 * Clear high usage sheet
 */
function clearHighUsageSheet() {
  var config = Config.get();
  var analyticsConfig = config.integrations.analytics;

  if (!analyticsConfig || !analyticsConfig.highUsageFilter) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'High usage filter is not configured',
      '⚠️ Not Configured',
      5
    );
    return;
  }

  var sheetName = analyticsConfig.highUsageFilter.sheetName;
  SheetHelpers.clearEntireSheet(sheetName);

  Logger.log('High usage sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('High usage sheet cleared!', '✅ Done', 5);
}
