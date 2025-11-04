// Version: 1.0.0
// Tests - Test and validation functions

/**
 * Tests module provides test functions for validating integrations
 * and troubleshooting issues
 */

/**
 * Test SimControl API key
 * Validates authentication and API access
 */
function testSimcontrolApiKey() {
  Logger.log('=== Testing SimControl API Key ===');

  var apiKey = Config.getApiKey('simcontrol');
  if (!apiKey) {
    Logger.logError('API key not found in Script Properties');
    SpreadsheetApp.getUi().alert('❌ API key not configured. Please set SIMCONTROL_API_KEY.');
    return;
  }

  try {
    var response = UrlFetchApp.fetch('https://app.simcontrol.co.za/api/organisations/balance', {
      method: 'get',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });

    var statusCode = response.getResponseCode();
    var result = response.getContentText();

    if (statusCode === 200) {
      Logger.log('✅ API key is valid. Balance response: ' + result);
      SpreadsheetApp.getUi().alert('✅ API key is valid!\n\nBalance: ' + result);
    } else {
      Logger.logError('API test failed. Status Code: ' + statusCode + ', Response: ' + result);
      SpreadsheetApp.getUi().alert('❌ API key test failed.\n\nStatus: ' + statusCode);
    }

  } catch (error) {
    Logger.logError('Error making API request', error);
    SpreadsheetApp.getUi().alert('❌ Error making API request. See debug log.');
  }
}


/**
 * Test SIM description update
 * WARNING: This will actually update a SIM description
 */
function testUpdateSimDescription() {
  Logger.log('=== Testing SIM Description Update ===');

  // Get test ICCID from user
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Test Description Update',
    'Enter ICCID to test (WARNING: This will update the SIM):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    Logger.log('Test cancelled by user');
    return;
  }

  var iccid = response.getResponseText().trim();
  if (!iccid) {
    ui.alert('No ICCID provided');
    return;
  }

  var description = 'TEST - ' + new Date().toISOString();

  Logger.log('Testing description update for ICCID: ' + iccid);

  try {
    var endpoint = '/sims?iccid=' + encodeURIComponent(iccid);
    var payload = { description: description };

    var result = SimControlAPI.call(endpoint, 'PATCH', payload);

    if (result) {
      Logger.log('✅ Test update succeeded for ICCID ' + iccid);
      ui.alert('✅ Test successful!\n\nICCID: ' + iccid + '\nNew description: ' + description);
    } else {
      Logger.logError('❌ Test update failed for ICCID ' + iccid);
      ui.alert('❌ Test failed. See debug log.');
    }

  } catch (error) {
    Logger.logError('Exception during test update', error);
    ui.alert('❌ Exception during test. See debug log.');
  }
}


/**
 * Test single SIM day usage fetch
 * Fetches usage for a specific SIM and date
 */
function testSingleSimDayUsage() {
  Logger.log('=== Testing Single SIM Day Usage ===');

  var ui = SpreadsheetApp.getUi();

  // Get MSISDN
  var msisdnResponse = ui.prompt(
    'Test Usage Fetch',
    'Enter MSISDN (e.g., +27836119431):',
    ui.ButtonSet.OK_CANCEL
  );

  if (msisdnResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var msisdn = msisdnResponse.getResponseText().trim();

  // Get date
  var dateResponse = ui.prompt(
    'Test Usage Fetch',
    'Enter date (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );

  if (dateResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var date = dateResponse.getResponseText().trim();

  Logger.log('Fetching usage for MSISDN: ' + msisdn + ', Date: ' + date);

  try {
    var endpoint = '/usage-details?msisdn=' + encodeURIComponent(msisdn) +
                   '&start_date=' + date +
                   '&end_date=' + date;

    var response = SimControlAPI.call(endpoint, 'GET', null);

    if (response && response.data && response.data[date]) {
      var usage = response.data[date];
      var airtime = usage.airtime_usage || 0;
      var data = usage.data_usage || 0;
      var sms = usage.sms_usage || 0;

      Logger.log('Airtime: ' + airtime + ', Data: ' + data + ', SMS: ' + sms);

      ui.alert(
        'Usage for ' + msisdn + ' on ' + date + '\n\n' +
        'Airtime: R' + airtime + '\n' +
        'Data: ' + data + ' MB\n' +
        'SMS: ' + sms
      );
    } else {
      Logger.log('No usage data found for ' + msisdn + ' on ' + date);
      ui.alert('No usage data found for specified date');
    }

  } catch (error) {
    Logger.logError('Error fetching usage', error);
    ui.alert('❌ Error fetching usage. See debug log.');
  }
}


/**
 * Test recharge fetch
 * Fetches recharges for a date range and logs to debug
 */
function testFetchRechargesToLog() {
  Logger.log('=== Testing Recharge Fetch ===');

  var ui = SpreadsheetApp.getUi();

  // Get date range
  var startResponse = ui.prompt(
    'Test Recharge Fetch',
    'Enter start date (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );

  if (startResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var startDate = startResponse.getResponseText().trim();

  var endResponse = ui.prompt(
    'Test Recharge Fetch',
    'Enter end date (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );

  if (endResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var endDate = endResponse.getResponseText().trim();

  Logger.log('Fetching recharges from ' + startDate + ' to ' + endDate);

  try {
    var recharges = fetchRechargesBetweenDates(startDate, endDate);

    if (!recharges || recharges.length === 0) {
      Logger.log('No recharges found between ' + startDate + ' and ' + endDate);
      ui.alert('No recharges found for specified date range');
      return;
    }

    Logger.log('📥 Recharge fetch returned ' + recharges.length + ' entries');

    // Inspect first recharge object
    var first = recharges[0];
    Logger.log('First recharge object: ' + JSON.stringify(first, null, 2));

    // Log all recharges
    for (var i = 0; i < recharges.length; i++) {
      var r = recharges[i];
      var id = r.transaction_id || 'N/A';
      var sim = r.msisdn || 'N/A';
      var status = r.status || 'N/A';
      var reference = r.reference || '';

      var summary = 'RechargeID ' + id + ' | SIM ' + sim + ' | ' + status + ' | Reference: ' + reference;
      Logger.log(summary);
    }

    Logger.log('✅ Finished logging recharge details');

    ui.alert(
      'Fetched ' + recharges.length + ' recharges\n\n' +
      'Check debug log for details'
    );

  } catch (error) {
    Logger.logError('Error fetching recharges', error);
    ui.alert('❌ Error fetching recharges. See debug log.');
  }
}


/**
 * Test module integrity
 * Verifies all modules are loaded and accessible
 */
function testModuleIntegrity() {
  Logger.log('=== Testing Module Integrity ===');

  var modules = {
    'Config': typeof Config !== 'undefined',
    'ApiClient': typeof ApiClient !== 'undefined',
    'SimControlAPI': typeof SimControlAPI !== 'undefined',
    'FotaWebAPI': typeof FotaWebAPI !== 'undefined',
    'Logger': typeof Logger !== 'undefined',
    'SheetHelpers': typeof SheetHelpers !== 'undefined',
    'DateHelpers': typeof DateHelpers !== 'undefined',
    'RateLimiter': typeof RateLimiter !== 'undefined'
  };

  var functions = {
    'getAllSIMs': typeof getAllSIMs === 'function',
    'getActiveSIMs': typeof getActiveSIMs === 'function',
    'fetchAirtimeUsage': typeof fetchAirtimeUsage === 'function',
    'fetchDataUsage': typeof fetchDataUsage === 'function',
    'fetchRecharges': typeof fetchRecharges === 'function',
    'analyzeUsageAge': typeof analyzeUsageAge === 'function',
    'extractHighUsage': typeof extractHighUsage === 'function'
  };

  var allPassed = true;
  var report = 'Module Integrity Test\n\n';

  report += '=== Modules ===\n';
  for (var module in modules) {
    var status = modules[module] ? '✅' : '❌';
    report += status + ' ' + module + '\n';
    if (!modules[module]) allPassed = false;
  }

  report += '\n=== Functions ===\n';
  for (var func in functions) {
    var status = functions[func] ? '✅' : '❌';
    report += status + ' ' + func + '\n';
    if (!functions[func]) allPassed = false;
  }

  Logger.log(report);

  if (allPassed) {
    SpreadsheetApp.getUi().alert('✅ All modules loaded successfully!');
  } else {
    SpreadsheetApp.getUi().alert('❌ Some modules failed to load. See debug log.');
  }
}


/**
 * Test configuration validation
 * Verifies configuration structure and values
 */
function testConfiguration() {
  Logger.log('=== Testing Configuration ===');

  try {
    var config = Config.get();

    var report = 'Configuration Test\n\n';

    // Check API keys
    report += '=== API Keys ===\n';
    var simcontrolKey = Config.getApiKey('simcontrol');
    var fotawebKey = Config.getApiKey('fotaweb');

    report += (simcontrolKey ? '✅' : '❌') + ' SimControl API Key\n';
    report += (fotawebKey ? '✅' : '⚠️') + ' FOTA Web API Key (optional)\n';

    // Check integrations
    report += '\n=== Integrations ===\n';
    var integrations = config.integrations;

    for (var key in integrations) {
      if (integrations[key] && integrations[key].enabled) {
        report += '✅ ' + key + ' (enabled)\n';
      } else {
        report += '⚪ ' + key + ' (disabled)\n';
      }
    }

    // Check defaults
    report += '\n=== Defaults ===\n';
    report += 'Start Date: ' + config.defaults.startDate + '\n';
    report += 'Log Sheet: ' + config.defaults.logSheetName + '\n';

    Logger.log(report);
    SpreadsheetApp.getUi().alert(report);

  } catch (error) {
    Logger.logError('Configuration test failed', error);
    SpreadsheetApp.getUi().alert('❌ Configuration test failed. See debug log.');
  }
}
