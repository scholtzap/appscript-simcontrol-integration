// Version: 1.0.0
// SimControlRecharges - Recharge tracking functionality

/**
 * SimControlRecharges module provides functions for fetching and managing
 * recharge history from SimControl API
 */

/**
 * Fetch recharges between specified dates
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of recharge objects
 */
function fetchRechargesBetweenDates(startDate, endDate) {
  Logger.log('Fetching recharges from ' + startDate + ' to ' + endDate);

  try {
    var params = {
      start_date: startDate,
      end_date: endDate,
      page_size: 100
    };

    var recharges = SimControlAPI.callWithPagination('/recharge', params);

    Logger.log('✅ Retrieved ' + recharges.length + ' recharges from ' + startDate + ' to ' + endDate);
    return recharges;

  } catch (e) {
    Logger.logError('Failed to fetch recharges', e);
    return [];
  }
}


/**
 * Fetch all recharges and write to sheet
 */
function fetchRecharges() {
  // Get configuration
  var config = Config.get();
  var rechargeConfig = config.integrations.recharges;

  if (!rechargeConfig || !rechargeConfig.enabled) {
    Logger.log('Recharges integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Recharges tracking is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = rechargeConfig.sheetName;
  var startDateStr = rechargeConfig.startDate || config.defaults.startDate;

  Logger.log('=== Starting Recharge Fetch ===');
  Logger.log('Sheet: ' + sheetName);
  Logger.log('Start Date: ' + startDateStr);

  // Get or create sheet
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Calculate date range (from start date to today)
  var endDate = new Date();
  var endDateStr = Utilities.formatDate(endDate, 'GMT', 'yyyy-MM-dd');

  // Fetch recharges
  var recharges = fetchRechargesBetweenDates(startDateStr, endDateStr);

  if (recharges.length === 0) {
    Logger.log('No recharges found in date range');
    SpreadsheetApp.getActiveSpreadsheet().toast('No recharges found', 'ℹ️ Info', 5);
    return;
  }

  // Clear sheet and prepare for new data
  sheet.clear();

  // Extract headers from first recharge object
  var headers = Object.keys(recharges[0]);
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Write recharge data
  var rows = recharges.map(function(recharge) {
    return headers.map(function(header) {
      var val = recharge[header];
      // Serialize nested objects to JSON
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  Logger.log('✅ Wrote ' + rows.length + ' recharges to ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Fetched ' + rows.length + ' recharges successfully',
    '✅ Done',
    5
  );
}


/**
 * Fetch recent recharges (today and yesterday)
 */
function fetchRecentRechargesToSheet() {
  // Get configuration
  var config = Config.get();
  var rechargeConfig = config.integrations.recharges;

  if (!rechargeConfig || !rechargeConfig.enabled) {
    Logger.log('Recharges integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Recharges tracking is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  Logger.log('=== Fetching Recent Recharges ===');

  // Calculate date range (yesterday and today)
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  var startDateStr = Utilities.formatDate(yesterday, 'GMT', 'yyyy-MM-dd');
  var endDateStr = Utilities.formatDate(today, 'GMT', 'yyyy-MM-dd');

  Logger.log('Fetching recharges from ' + startDateStr + ' to ' + endDateStr);

  var recharges = fetchRechargesBetweenDates(startDateStr, endDateStr);

  if (recharges.length === 0) {
    Logger.log('No recent recharges found');
    SpreadsheetApp.getActiveSpreadsheet().toast('No recent recharges found', 'ℹ️ Info', 5);
    return;
  }

  var sheetName = rechargeConfig.sheetName;
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Check if sheet has headers
  var existingCols = sheet.getLastColumn();
  var headers;

  if (existingCols > 0) {
    headers = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  } else {
    // Create headers from first recharge
    headers = Object.keys(recharges[0]);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  // Append new recharges
  var rows = recharges.map(function(recharge) {
    return headers.map(function(header) {
      var val = recharge[header];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);

  Logger.log('✅ Appended ' + rows.length + ' recent recharges');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Added ' + rows.length + ' recent recharges',
    '✅ Done',
    5
  );
}


/**
 * Clear recharges sheet
 */
function clearRechargesSheet() {
  var config = Config.get();
  var rechargeConfig = config.integrations.recharges;

  if (!rechargeConfig || !rechargeConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Recharges integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = rechargeConfig.sheetName;
  SheetHelpers.clearEntireSheet(sheetName);

  Logger.log('Recharges sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('Recharges sheet cleared!', '✅ Done', 5);
}
