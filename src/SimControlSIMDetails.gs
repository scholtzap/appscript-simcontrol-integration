// Version: 1.0.0
// SimControlSIMDetails - Full SIM details export

/**
 * SimControlSIMDetails module provides functions for exporting complete
 * SIM details with all metadata fields
 */

/**
 * Fetch all SIM details and write to sheet
 * Exports all SIM fields including ICCID, IMSI, MSISDN, balances, tags, etc.
 */
function fetchAllSIMDetailsToSheet() {
  // Get configuration
  var config = Config.get();
  var simDetailsConfig = config.integrations.simDetails;

  if (!simDetailsConfig || !simDetailsConfig.enabled) {
    Logger.log('SIM Details integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'SIM Details export is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = simDetailsConfig.sheetName;

  Logger.log('=== Fetching All SIM Details ===');
  Logger.log('Sheet: ' + sheetName);

  // Get or create sheet
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Clear existing data
  sheet.clear();

  // Get all SIMs
  var sims = getAllSIMs();

  if (!sims || sims.length === 0) {
    Logger.logError('No SIMs retrieved in fetchAllSIMDetailsToSheet');
    SpreadsheetApp.getActiveSpreadsheet().toast('No SIMs found', '⚠️ Warning', 5);
    return;
  }

  Logger.log('Retrieved ' + sims.length + ' SIMs');

  // Determine all possible fields from first SIM
  var headers = Object.keys(sims[0] || {});

  if (headers.length === 0) {
    Logger.logError('No SIM fields found');
    SpreadsheetApp.getActiveSpreadsheet().toast('No SIM fields found', '❌ Error', 5);
    return;
  }

  // Write headers
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  Logger.log('Writing ' + sims.length + ' SIMs with ' + headers.length + ' fields each');

  // Write SIM data
  var rows = sims.map(function(sim) {
    return headers.map(function(header) {
      var val = sim[header];
      // Serialize nested objects to JSON
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  Logger.log('✅ Wrote ' + rows.length + ' SIMs to ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Exported ' + rows.length + ' SIMs with full details',
    '✅ Done',
    5
  );
}


/**
 * Refresh SIM details (alias for fetchAllSIMDetailsToSheet)
 */
function refreshSIMDetails() {
  fetchAllSIMDetailsToSheet();
}


/**
 * Clear SIM details sheet
 */
function clearSIMDetailsSheet() {
  var config = Config.get();
  var simDetailsConfig = config.integrations.simDetails;

  if (!simDetailsConfig || !simDetailsConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'SIM Details integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = simDetailsConfig.sheetName;
  SheetHelpers.clearEntireSheet(sheetName);

  Logger.log('SIM Details sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('SIM Details sheet cleared!', '✅ Done', 5);
}
