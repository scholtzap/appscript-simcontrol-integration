// Version: 1.0.0
// ValidationSuite - Automated testing and validation

/**
 * ValidationSuite provides automated testing for all integrations
 * Run via Menu → Utilities → Run Full Test Suite
 */

/**
 * Run full automated test suite
 * Tests all modules, integrations, and configurations
 */
function runFullTestSuite() {
  Logger.log('=== STARTING FULL TEST SUITE ===');
  var startTime = new Date().getTime();

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };

  // Core tests
  runTest(results, 'Module Integrity', testModuleIntegrity);
  runTest(results, 'Configuration', testConfiguration);
  runTest(results, 'SimControl API Key', testSimcontrolApiKey);

  // SIM management tests
  runTest(results, 'SIM Retrieval', validateSIMRetrieval);

  // Integration tests (only if enabled)
  var config = Config.get();

  if (config.integrations.airtime && config.integrations.airtime.enabled) {
    runTest(results, 'Airtime Sheet Structure', validateAirtimeSheetStructure);
  }

  if (config.integrations.data && config.integrations.data.enabled) {
    runTest(results, 'Data Sheet Structure', validateDataSheetStructure);
  }

  if (config.integrations.recharges && config.integrations.recharges.enabled) {
    runTest(results, 'Recharges Sheet Structure', validateRechargesSheetStructure);
  }

  if (config.integrations.analytics && config.integrations.analytics.enabled) {
    if (config.integrations.analytics.usageAgeAnalysis &&
        config.integrations.analytics.usageAgeAnalysis.enabled) {
      runTest(results, 'Usage Age Analysis Sheet', validateUsageAgeSheetStructure);
    }
  }

  // Helper functions test
  runTest(results, 'Sheet Helpers', validateSheetHelpers);
  runTest(results, 'Date Helpers', validateDateHelpers);
  runTest(results, 'Rate Limiter', validateRateLimiter);

  var endTime = new Date().getTime();
  var duration = (endTime - startTime) / 1000;

  // Generate report
  var report = generateTestReport(results, duration);
  Logger.log(report);

  // Show results dialog
  SpreadsheetApp.getUi().alert(report);

  return results;
}


/**
 * Run a single test and record results
 */
function runTest(results, testName, testFunction) {
  results.total++;
  Logger.log('Running: ' + testName);

  try {
    var result = testFunction();

    if (result === true || result === undefined) {
      results.passed++;
      results.tests.push({name: testName, status: 'PASS', error: null});
      Logger.log('✅ PASS: ' + testName);
    } else if (result === false) {
      results.failed++;
      results.tests.push({name: testName, status: 'FAIL', error: 'Test returned false'});
      Logger.logError('❌ FAIL: ' + testName);
    } else if (result === null) {
      results.skipped++;
      results.tests.push({name: testName, status: 'SKIP', error: 'Test skipped'});
      Logger.log('⚪ SKIP: ' + testName);
    }
  } catch (e) {
    results.failed++;
    results.tests.push({name: testName, status: 'ERROR', error: e.message});
    Logger.logError('❌ ERROR: ' + testName + ' - ' + e.message);
  }
}


/**
 * Generate test report summary
 */
function generateTestReport(results, duration) {
  var report = '=== TEST SUITE RESULTS ===\n\n';
  report += 'Total Tests: ' + results.total + '\n';
  report += '✅ Passed: ' + results.passed + '\n';
  report += '❌ Failed: ' + results.failed + '\n';
  report += '⚪ Skipped: ' + results.skipped + '\n';
  report += 'Duration: ' + duration + 's\n\n';

  report += '=== Test Details ===\n';
  for (var i = 0; i < results.tests.length; i++) {
    var test = results.tests[i];
    var icon = test.status === 'PASS' ? '✅' :
               test.status === 'SKIP' ? '⚪' : '❌';
    report += icon + ' ' + test.name + ' - ' + test.status;
    if (test.error) {
      report += ' (' + test.error + ')';
    }
    report += '\n';
  }

  report += '\n';
  if (results.failed === 0) {
    report += '🎉 All tests passed!';
  } else {
    report += '⚠️ ' + results.failed + ' test(s) failed. Check debug log for details.';
  }

  return report;
}


/**
 * Validate SIM retrieval works
 */
function validateSIMRetrieval() {
  Logger.log('Testing SIM retrieval...');

  var sims = getActiveSIMs();

  if (!sims || !Array.isArray(sims)) {
    Logger.logError('getActiveSIMs() did not return an array');
    return false;
  }

  Logger.log('Retrieved ' + sims.length + ' active SIMs');

  if (sims.length === 0) {
    Logger.log('⚠️ Warning: No SIMs returned (might be expected for test environment)');
    return null; // Skip test
  }

  // Verify SIM structure
  var firstSim = sims[0];
  if (!firstSim.iccid && !firstSim.msisdn) {
    Logger.logError('SIM missing required fields (iccid or msisdn)');
    return false;
  }

  Logger.log('Sample SIM structure validated');
  return true;
}


/**
 * Validate Airtime sheet structure
 */
function validateAirtimeSheetStructure() {
  var config = Config.get();
  var sheetName = config.integrations.airtime.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  // Sheet might not exist yet if no data fetched
  if (!sheet) {
    Logger.log('Airtime sheet does not exist yet (expected if no data fetched)');
    return null; // Skip
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    Logger.log('Airtime sheet is empty');
    return null; // Skip
  }

  // Validate header
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (header[0] !== 'Date') {
    Logger.logError('Airtime sheet header invalid. First column should be "Date"');
    return false;
  }

  Logger.log('Airtime sheet structure valid: ' + lastRow + ' rows, ' + lastCol + ' columns');
  return true;
}


/**
 * Validate Data sheet structure
 */
function validateDataSheetStructure() {
  var config = Config.get();
  var sheetName = config.integrations.data.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('Data sheet does not exist yet');
    return null; // Skip
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    Logger.log('Data sheet is empty');
    return null; // Skip
  }

  // Validate header
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (header[0] !== 'Date') {
    Logger.logError('Data sheet header invalid');
    return false;
  }

  Logger.log('Data sheet structure valid: ' + lastRow + ' rows, ' + lastCol + ' columns');
  return true;
}


/**
 * Validate Recharges sheet structure
 */
function validateRechargesSheetStructure() {
  var config = Config.get();
  var sheetName = config.integrations.recharges.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('Recharges sheet does not exist yet');
    return null; // Skip
  }

  var lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    Logger.log('Recharges sheet is empty');
    return null; // Skip
  }

  Logger.log('Recharges sheet exists with ' + lastRow + ' rows');
  return true;
}


/**
 * Validate Usage Age Analysis sheet structure
 */
function validateUsageAgeSheetStructure() {
  var config = Config.get();

  if (!config.integrations.analytics ||
      !config.integrations.analytics.usageAgeAnalysis) {
    return null; // Skip
  }

  var sheetName = config.integrations.analytics.usageAgeAnalysis.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('Usage Age sheet does not exist yet');
    return null; // Skip
  }

  var lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    Logger.log('Usage Age sheet is empty');
    return null; // Skip
  }

  // Validate headers
  var expectedHeaders = ['MSISDN', 'Status', 'Last Usage Date', 'Days Since Last Usage'];
  var actualHeaders = sheet.getRange(1, 1, 1, 4).getValues()[0];

  for (var i = 0; i < expectedHeaders.length; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      Logger.logError('Usage Age header mismatch at position ' + i);
      return false;
    }
  }

  Logger.log('Usage Age sheet structure valid');
  return true;
}


/**
 * Validate Sheet Helpers module
 */
function validateSheetHelpers() {
  Logger.log('Testing SheetHelpers module...');

  // Test getOrCreateSheet
  var testSheetName = '[TEST] Validation Test';
  var sheet = SheetHelpers.getOrCreateSheet(testSheetName);

  if (!sheet) {
    Logger.logError('SheetHelpers.getOrCreateSheet() failed');
    return false;
  }

  // Clean up test sheet
  try {
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sheet);
  } catch (e) {
    // Ignore cleanup errors
  }

  Logger.log('SheetHelpers module validated');
  return true;
}


/**
 * Validate Date Helpers module
 */
function validateDateHelpers() {
  Logger.log('Testing DateHelpers module...');

  // Test date formatting
  var testDate = new Date('2025-01-15T10:30:00Z');
  var formatted = DateHelpers.formatDate(testDate);

  if (formatted !== '2025-01-15') {
    Logger.logError('DateHelpers.formatDate() returned unexpected value: ' + formatted);
    return false;
  }

  Logger.log('DateHelpers module validated');
  return true;
}


/**
 * Validate Rate Limiter module
 */
function validateRateLimiter() {
  Logger.log('Testing RateLimiter module...');

  // Test checkAndWait (should always return true initially)
  var canProceed = RateLimiter.checkAndWait();

  if (typeof canProceed !== 'boolean') {
    Logger.logError('RateLimiter.checkAndWait() did not return boolean');
    return false;
  }

  Logger.log('RateLimiter module validated');
  return true;
}


/**
 * Validate trigger management
 */
function validateTriggerManagement() {
  Logger.log('Testing trigger management...');

  // List triggers (should not crash)
  try {
    var triggers = ScriptApp.getProjectTriggers();
    Logger.log('Found ' + triggers.length + ' existing triggers');
    return true;
  } catch (e) {
    Logger.logError('Failed to list triggers: ' + e.message);
    return false;
  }
}


/**
 * Quick smoke test - runs essential tests only
 */
function runSmokeTest() {
  Logger.log('=== RUNNING SMOKE TEST ===');

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };

  runTest(results, 'Module Integrity', testModuleIntegrity);
  runTest(results, 'Configuration', testConfiguration);
  runTest(results, 'SimControl API Key', testSimcontrolApiKey);

  var report = generateTestReport(results, 0);
  Logger.log(report);
  SpreadsheetApp.getUi().alert(report);

  return results.failed === 0;
}


/**
 * Validate specific integration
 * @param {string} integration - Integration name (airtime, data, recharges, etc.)
 */
function validateIntegration(integration) {
  Logger.log('=== Validating ' + integration + ' integration ===');

  var config = Config.get();

  if (!config.integrations[integration]) {
    Logger.logError('Integration not found: ' + integration);
    return false;
  }

  if (!config.integrations[integration].enabled) {
    Logger.log('Integration is disabled: ' + integration);
    return null;
  }

  Logger.log('Integration enabled: ' + integration);
  Logger.log('Sheet name: ' + config.integrations[integration].sheetName);

  return true;
}
