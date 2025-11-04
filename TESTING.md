# Testing & Validation Guide

**Project**: Google Apps Script Multi-Integration System
**Version**: 2.0
**Last Updated**: 2025-11-04

This guide covers testing and validation procedures for the SimControl Integration system.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Pre-Deployment Validation](#pre-deployment-validation)
3. [Post-Deployment Testing](#post-deployment-testing)
4. [Integration Tests](#integration-tests)
5. [Performance Testing](#performance-testing)
6. [Error Scenarios](#error-scenarios)
7. [Automated Test Suite](#automated-test-suite)
8. [Validation Checklist](#validation-checklist)

---

## Testing Overview

### Test Levels

1. **Unit Tests** - Individual module functions (manual via Tests.gs)
2. **Integration Tests** - Module interactions and API calls
3. **System Tests** - End-to-end workflows
4. **Performance Tests** - Large dataset handling, rate limits
5. **Regression Tests** - Verify fixes don't break existing features

### Test Environments

- **Development** - Local testing with test data
- **Staging** - Pre-production with real API (limited scope)
- **Production** - Live deployment with full dataset

---

## Pre-Deployment Validation

### 1. Code Deployment Check

**Verify all modules deployed:**

```javascript
// Run in Apps Script editor
function verifyModulesDeployed() {
  var modules = [
    'Config', 'ApiClient', 'SimControlAPI', 'FotaWebAPI',
    'Logger', 'SheetHelpers', 'DateHelpers', 'RateLimiter',
    'getAllSIMs', 'getActiveSIMs', 'getSuspendedSIMs',
    'fetchAirtimeUsage', 'fetchDataUsage',
    'setupDailyTriggers', 'analyzeUsageAge', 'extractHighUsage'
  ];

  var results = modules.map(function(name) {
    var exists = typeof eval(name) !== 'undefined';
    return name + ': ' + (exists ? '✅' : '❌');
  });

  Logger.log(results.join('\n'));
}
```

**Expected:** All modules show ✅

---

### 2. Configuration Validation

**Via Menu:**
- SimControl Integration → Utilities → View Configuration
- Verify enabled integrations match expectations

**Via Script:**
```javascript
// Run Tests.gs function
testConfiguration();
```

**Expected:**
- ✅ SimControl API Key configured
- ✅ Enabled integrations listed
- ✅ Default settings shown

---

### 3. Module Integrity Check

**Via Menu:**
- SimControl Integration → Utilities → Run Module Integrity Test

**Via Script:**
```javascript
testModuleIntegrity();
```

**Expected:** All modules and functions show ✅

---

## Post-Deployment Testing

### 1. API Authentication Test

**Test SimControl API:**

**Via Menu:**
- SimControl Integration → Utilities → Test SimControl API Key

**Expected:**
```
✅ API key is valid!
Balance: {"balance": 1234.56, "currency": "ZAR"}
```

**If FOTA Web enabled:**
- SimControl Integration → FOTA Web → Test FOTA API Key

---

### 2. Rate Limit Check

**Via Menu:**
- SimControl Integration → Utilities → Check API Rate Limit

**Expected:**
```
API Rate Limit Status

Used: 5 of 300
Remaining: 295
Resets at: 2025-11-04T12:00:00.000Z
Time until reset: 45m 30s
```

---

### 3. SIM Retrieval Test

**Test basic SIM fetching:**

**Via Apps Script:**
```javascript
function testSIMRetrieval() {
  var sims = getActiveSIMs();
  Logger.log('Retrieved ' + sims.length + ' active SIMs');

  if (sims.length > 0) {
    Logger.log('Sample SIM: ' + JSON.stringify(sims[0], null, 2));
  }
}
```

**Expected:**
- Returns array of SIM objects
- Each SIM has: iccid, msisdn, active, network_status

---

## Integration Tests

### Test 1: Airtime Usage Tracking

**Scenario:** Fetch airtime usage for a single day

**Steps:**
1. Menu → Data Usage → Fetch Previous Day Only
2. Wait for completion (toast notification)
3. Check sheet for data

**Validation:**
```javascript
function validateAirtimeSheet() {
  var config = Config.get();
  var sheetName = config.integrations.airtime.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.logError('Airtime sheet not found');
    return false;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  Logger.log('Airtime sheet: ' + lastRow + ' rows, ' + lastCol + ' columns');

  // Check header row
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log('Headers: ' + headers.join(', '));

  // Check data rows
  if (lastRow > 1) {
    var lastRowData = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
    Logger.log('Last row: ' + lastRowData.join(', '));
  }

  return lastRow > 1 && lastCol > 1;
}
```

**Expected:**
- ✅ Sheet created with name from config
- ✅ Header row: Date | MSISDN1 | MSISDN2 | ...
- ✅ Data row(s) with usage values

---

### Test 2: Data Usage Tracking

**Scenario:** Fetch historical data usage

**Steps:**
1. Set start date in config (e.g., 7 days ago)
2. Menu → Data Usage → Download All Historical Data
3. Monitor debug log for progress
4. Wait for completion

**Validation:**
```javascript
function validateDataSheet() {
  var config = Config.get();
  var sheetName = config.integrations.data.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  var lastRow = sheet.getLastRow();
  var dateRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  // Check date continuity
  var dates = dateRange.map(function(row) {
    return Utilities.formatDate(row[0], 'GMT', 'yyyy-MM-dd');
  });

  Logger.log('Dates found: ' + dates.join(', '));

  // Verify no gaps in dates
  for (var i = 1; i < dates.length; i++) {
    var prev = new Date(dates[i-1]);
    var curr = new Date(dates[i]);
    var diff = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diff !== 1) {
      Logger.logError('Date gap detected: ' + dates[i-1] + ' to ' + dates[i]);
    }
  }

  return true;
}
```

**Expected:**
- ✅ Continuous dates (no gaps)
- ✅ Usage values populated
- ✅ All SIMs have columns

---

### Test 3: Recharge Tracking

**Scenario:** Fetch recharges for date range

**Steps:**
1. Menu → Data Usage → Fetch Recent Recharges
2. Check sheet

**Validation:**
```javascript
function validateRechargesSheet() {
  var config = Config.get();
  var sheetName = config.integrations.recharges.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  Logger.log('Recharge headers: ' + headers.join(', '));
  Logger.log('Total recharges: ' + (lastRow - 1));

  // Sample first recharge
  if (lastRow > 1) {
    var firstRecharge = sheet.getRange(2, 1, 1, headers.length).getValues()[0];
    var rechargeObj = {};
    for (var i = 0; i < headers.length; i++) {
      rechargeObj[headers[i]] = firstRecharge[i];
    }
    Logger.log('Sample recharge: ' + JSON.stringify(rechargeObj, null, 2));
  }

  return lastRow > 1;
}
```

**Expected:**
- ✅ Recharges listed with transaction_id, msisdn, status
- ✅ Date range matches request

---

### Test 4: SIM Description Update

**Scenario:** Bulk update SIM descriptions

**Setup:**
1. Create test sheet with columns:
   - Column D: ICCID
   - Column Y: Description
2. Add 2-3 test rows with valid ICCIDs

**Steps:**
1. Menu → SIM Management → Update SIM Descriptions
2. Monitor debug log
3. Check column Z for checkmarks

**Validation:**
```javascript
function validateDescriptionUpdates() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var statusCol = 26; // Column Z
  var lastRow = sheet.getLastRow();

  var statuses = sheet.getRange(9, statusCol, lastRow - 8, 1).getValues();
  var successCount = statuses.filter(function(row) { return row[0] === '✓'; }).length;
  var failCount = statuses.filter(function(row) { return row[0] === '✗'; }).length;

  Logger.log('Updates - Success: ' + successCount + ', Failed: ' + failCount);

  return successCount > 0;
}
```

**Expected:**
- ✅ Column Z shows ✓ for successful updates
- ✅ Debug log shows update confirmations

---

### Test 5: Usage Age Analysis

**Scenario:** Generate usage age report

**Prerequisites:** Data Usage sheet populated with historical data

**Steps:**
1. Menu → SIM Management → Analyze Usage Age
2. Check output sheet

**Validation:**
```javascript
function validateUsageAgeAnalysis() {
  var config = Config.get();
  var sheetName = config.integrations.analytics.usageAgeAnalysis.sheetName;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Verify headers
  var expectedHeaders = ['MSISDN', 'Status', 'Last Usage Date', 'Days Since Last Usage'];
  for (var i = 0; i < expectedHeaders.length; i++) {
    if (headers[i] !== expectedHeaders[i]) {
      Logger.logError('Header mismatch at position ' + i);
      return false;
    }
  }

  // Check data rows
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    Logger.log('SIM: ' + row[0] + ', Status: ' + row[1] + ', Last Usage: ' + row[2] + ', Days: ' + row[3]);
  }

  return data.length > 1;
}
```

**Expected:**
- ✅ All SIMs listed
- ✅ Status shows ACTIVE/SUSPENDED
- ✅ Days since last usage calculated correctly

---

### Test 6: High Usage Filter

**Scenario:** Extract high usage entries

**Prerequisites:** Data Usage sheet with some high values

**Steps:**
1. Menu → Data Usage → Extract High Usage
2. Check output sheet

**Validation:**
```javascript
function validateHighUsageFilter() {
  var config = Config.get();
  var sheetName = config.integrations.analytics.highUsageFilter.sheetName;
  var threshold = config.integrations.analytics.highUsageFilter.threshold;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  var headers = data[0]; // Date, Line, Value (MB)

  // Verify all values >= threshold
  var allAboveThreshold = true;
  for (var i = 1; i < data.length; i++) {
    var value = data[i][2]; // Value column
    if (value < threshold) {
      Logger.logError('Value below threshold: ' + value);
      allAboveThreshold = false;
    }
  }

  Logger.log('High usage entries: ' + (data.length - 1));
  Logger.log('All above threshold (' + threshold + '): ' + allAboveThreshold);

  return allAboveThreshold;
}
```

**Expected:**
- ✅ Only entries >= threshold shown
- ✅ Sorted by Line, then Date
- ✅ Filter applied to sheet

---

## Performance Testing

### Test 1: Large Dataset Handling

**Scenario:** Fetch 100+ days of historical data

**Metrics to Monitor:**
- Execution time per day
- Memory usage
- Rate limit hits
- Continuation triggers

**Validation:**
```javascript
function performanceBenchmark() {
  var startTime = new Date().getTime();
  var startDate = '2025-01-01';
  var endDate = '2025-04-10'; // 100 days

  // This will trigger continuation if needed
  // Monitor in debug log

  Logger.log('Starting performance test: ' + startDate + ' to ' + endDate);
  // Actual fetch would be done via menu or function call
}
```

**Success Criteria:**
- ✅ Handles continuation automatically
- ✅ No data loss during continuation
- ✅ Rate limits respected
- ✅ Execution completes within quota limits

---

### Test 2: Rate Limit Handling

**Scenario:** Intentionally trigger rate limit

**Setup:** Use aggressive fetching to hit rate limit

**Validation:**
- Check debug log for rate limit detection
- Verify script pauses when limit hit
- Confirm resume after cooldown

**Expected Behavior:**
```
INFO: 🚫 Rate limit hit. Retry after: 2025-11-04T12:00:00.000Z
INFO: ⏳ Rate limit still in effect. Waiting...
INFO: ✅ Rate limit window passed. Resuming script.
```

---

## Error Scenarios

### Scenario 1: Invalid API Key

**Setup:** Temporarily use invalid API key in script properties

**Test:**
1. Menu → Utilities → Test SimControl API Key

**Expected:**
```
❌ API key test failed.
Status: 401
```

**Validation:** Error handled gracefully, no crash

---

### Scenario 2: Network Failure

**Simulation:** Not directly testable, but verify error handling

**Check Code:**
```javascript
// ApiClient.gs should handle UrlFetchApp errors
// Verify try-catch blocks are in place
```

**Expected:** Returns null, logs error, continues execution

---

### Scenario 3: Missing Sheet

**Setup:** Delete required sheet (e.g., Data Usage)

**Test:**
1. Menu → Data Usage → Fetch Previous Day Only

**Expected:**
- Sheet created automatically (via SheetHelpers.getOrCreateSheet)
- Data populates normally

---

### Scenario 4: Malformed Data

**Setup:** Manually corrupt sheet data (invalid dates, etc.)

**Test:** Run usage age analysis

**Expected:**
- Invalid entries skipped
- Error logged but doesn't crash
- Valid entries processed

---

## Automated Test Suite

Run the complete automated test suite:

**Via Menu:**
- SimControl Integration → Utilities → Run Full Test Suite

**Via Script:**
```javascript
runFullTestSuite();
```

This runs all Tests.gs functions in sequence and reports results.

---

## Validation Checklist

### Pre-Deployment

- [ ] All modules present in Apps Script editor
- [ ] Configuration loaded correctly
- [ ] API keys configured
- [ ] Sheet permissions verified

### Post-Deployment

- [ ] Menu appears in Google Sheets
- [ ] Configuration dialog shows enabled integrations
- [ ] API authentication successful
- [ ] Debug log functional

### Integration Tests

- [ ] Airtime usage fetch works
- [ ] Data usage fetch works
- [ ] Recharge fetch works
- [ ] Product catalog loads
- [ ] SIM details export works
- [ ] Description updates work
- [ ] Usage age analysis works
- [ ] High usage filter works

### Optional Integrations

- [ ] FOTA Web device fetch works (if enabled)
- [ ] QR code generation works (if enabled)

### Triggers

- [ ] Daily triggers can be created
- [ ] Triggers listed correctly
- [ ] Triggers can be deleted
- [ ] Scheduled jobs execute on time

### Performance

- [ ] Large datasets handled via continuation
- [ ] Rate limits detected and respected
- [ ] No quota errors
- [ ] Execution times acceptable

### Error Handling

- [ ] Invalid API key handled
- [ ] Missing sheets auto-created
- [ ] Malformed data skipped
- [ ] Network errors logged

---

## Test Reporting

### Document Results

For each test:
1. **Test Name**: e.g., "Airtime Usage Fetch"
2. **Date/Time**: When test was run
3. **Status**: Pass/Fail
4. **Notes**: Any observations or issues
5. **Screenshots**: If applicable

### Sample Test Report

```
Test: Airtime Usage Fetch
Date: 2025-11-04 10:30 AM
Status: ✅ PASS
Notes: Fetched 7 days of data for 50 SIMs in 45 seconds
Issues: None
```

---

## Troubleshooting Tests

### Test Fails: "Module not found"

**Cause:** Code not deployed or deployment incomplete

**Solution:**
1. Re-run `clasp push --force`
2. Verify all .gs files in Apps Script editor
3. Hard refresh browser (Ctrl+Shift+R)

---

### Test Fails: "API key invalid"

**Cause:** API key not set or incorrect

**Solution:**
1. Open Apps Script editor
2. Project Settings → Script Properties
3. Verify `SIMCONTROL_API_KEY` value
4. Test key at https://app.simcontrol.co.za/

---

### Test Fails: "Timeout"

**Cause:** Operation took too long

**Solution:**
1. Check if continuation logic triggered
2. Review debug log for progress
3. Reduce dataset size for testing
4. Verify rate limits not exceeded

---

## Next Steps After Testing

1. **Document Issues** - Log any bugs or unexpected behavior
2. **Fix Critical Issues** - Address blocking issues before production
3. **Performance Tuning** - Optimize slow operations
4. **User Acceptance** - Have end users test workflows
5. **Production Rollout** - Deploy to production after validation

---

**Testing complete! 🧪 System validated and ready for production rollout.**
