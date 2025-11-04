// Version: 1.0.0
// FotaWeb - Teltonika FOTA Web API integration

/**
 * FotaWeb module provides functions for integrating with Teltonika FOTA Web API
 * for device management and firmware updates
 */

/**
 * Fetch all device data from FOTA Web API
 * Uses pagination to retrieve all devices
 */
function fetchFotaWebData() {
  // Get configuration
  var config = Config.get();
  var fotaConfig = config.integrations.fotaweb;

  if (!fotaConfig || !fotaConfig.enabled) {
    Logger.log('FOTA Web integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'FOTA Web integration is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = fotaConfig.sheetName;

  Logger.log('=== Fetching FOTA Web Device Data ===');
  Logger.log('Sheet: ' + sheetName);

  // Get or create sheet
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Clear existing data
  sheet.clear();

  var allDevices = [];
  var headersSet = {};
  var page = 1;
  var perPage = 100;

  // Fetch all pages
  while (true) {
    var endpoint = '/devices?page=' + page + '&per_page=' + perPage;
    Logger.log('Fetching page ' + page);

    var result = FotaWebAPI.call(endpoint, 'GET');

    if (!result || !Array.isArray(result) || result.length === 0) {
      break;
    }

    // Collect devices
    allDevices = allDevices.concat(result);

    // Collect all unique headers
    for (var i = 0; i < result.length; i++) {
      var device = result[i];
      var keys = Object.keys(device);
      for (var j = 0; j < keys.length; j++) {
        headersSet[keys[j]] = true;
      }
    }

    // Check if there are more pages (FOTA API doesn't provide explicit pagination meta)
    // If we got fewer results than per_page, we're done
    if (result.length < perPage) {
      break;
    }

    page++;
  }

  Logger.log('Retrieved ' + allDevices.length + ' devices');

  if (allDevices.length === 0) {
    Logger.log('No devices found');
    SpreadsheetApp.getActiveSpreadsheet().toast('No devices found', 'ℹ️ Info', 5);
    return;
  }

  // Convert headers set to array
  var headers = Object.keys(headersSet);

  // Write headers
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Write device data
  var rows = allDevices.map(function(device) {
    return headers.map(function(header) {
      var val = device[header];
      // Serialize nested objects to JSON
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val !== undefined ? val : '';
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  Logger.log('✅ Wrote ' + rows.length + ' devices to ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Fetched ' + rows.length + ' devices successfully',
    '✅ Done',
    5
  );
}


/**
 * Get FOTA Web company information
 * Useful for verifying API access and getting company ID
 */
function getFotaCompanyInfo() {
  // Get configuration
  var config = Config.get();
  var fotaConfig = config.integrations.fotaweb;

  if (!fotaConfig || !fotaConfig.enabled) {
    Logger.log('FOTA Web integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'FOTA Web integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  Logger.log('Fetching FOTA Web company info');

  try {
    var response = FotaWebAPI.call('/devices?page=1&per_page=1', 'GET');

    if (Array.isArray(response) && response.length > 0 && response[0].created_by) {
      var createdBy = response[0].created_by;
      var companyId = createdBy.company_id || 'N/A';
      var userEmail = createdBy.email || 'N/A';

      Logger.log('✅ FOTA Web Company ID: ' + companyId);
      Logger.log('✅ API User Email: ' + userEmail);

      SpreadsheetApp.getUi().alert(
        'FOTA Web Company Info\n\n' +
        'Company ID: ' + companyId + '\n' +
        'User Email: ' + userEmail
      );
    } else {
      Logger.log('⚠️ No device data or company info found');
      SpreadsheetApp.getUi().alert('⚠️ Could not find company info from API');
    }

  } catch (e) {
    Logger.logError('Error fetching company info', e);
    SpreadsheetApp.getUi().alert('❌ Failed to fetch company info. See debug log.');
  }
}


/**
 * Test FOTA Web API key
 * Verifies API connectivity and authentication
 */
function testFotaWebApiKey() {
  // Get configuration
  var config = Config.get();
  var fotaConfig = config.integrations.fotaweb;

  if (!fotaConfig || !fotaConfig.enabled) {
    Logger.log('FOTA Web integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'FOTA Web integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  Logger.log('Testing FOTA Web API key');

  try {
    var result = FotaWebAPI.call('/devices?page=1&per_page=1', 'GET');

    if (Array.isArray(result)) {
      Logger.log('✅ API Key is valid');
      SpreadsheetApp.getUi().alert('✅ FOTA Web API Key is valid');
    } else {
      Logger.log('❌ API key might be invalid or access is restricted');
      SpreadsheetApp.getUi().alert('❌ API key might be invalid or access is restricted');
    }

  } catch (e) {
    Logger.logError('Error during API key test', e);
    SpreadsheetApp.getUi().alert('❌ API key test failed. See debug log.');
  }
}


/**
 * Copy FOTA data to device-SIM association sheet
 * Helper function for data organization
 */
function copyFOTAtoDeviceSIMAss() {
  // Get configuration
  var config = Config.get();
  var fotaConfig = config.integrations.fotaweb;

  if (!fotaConfig || !fotaConfig.enabled) {
    Logger.log('FOTA Web integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'FOTA Web integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheetName = fotaConfig.sheetName;
  var targetSheetName = fotaConfig.associationSheetName || '[AUTO] Device & SIM Ass.';

  var sourceSheet = ss.getSheetByName(sourceSheetName);
  var targetSheet = ss.getSheetByName(targetSheetName);

  if (!sourceSheet || !targetSheet) {
    Logger.logError('Source or target sheet not found');
    SpreadsheetApp.getUi().alert('One of the required sheets does not exist');
    return;
  }

  // Get values from column A (device IDs/names)
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data to copy from FOTA sheet');
    return;
  }

  var sourceRange = sourceSheet.getRange(2, 1, lastRow - 1, 1);
  var values = sourceRange.getValues();

  // Write to target sheet starting at row 9 (configurable)
  var targetStartRow = fotaConfig.associationStartRow || 9;
  var targetRange = targetSheet.getRange(targetStartRow, 1, values.length, 1);

  // Clear old values first
  targetRange.clearContent();

  // Set new values
  targetRange.setValues(values);

  Logger.log('✅ Copied ' + values.length + ' device entries to ' + targetSheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Copied ' + values.length + ' entries',
    '✅ Done',
    5
  );
}


/**
 * Clear FOTA Web sheet
 */
function clearFotaSheet() {
  var config = Config.get();
  var fotaConfig = config.integrations.fotaweb;

  if (!fotaConfig || !fotaConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'FOTA Web integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = fotaConfig.sheetName;
  SheetHelpers.clearEntireSheet(sheetName);

  Logger.log('FOTA Web sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('FOTA Web sheet cleared!', '✅ Done', 5);
}
