// Version: 1.0.0
// SimControlUsage - Generic usage fetcher for airtime and data tracking

/**
 * SimControlUsage module provides generic usage tracking for both:
 * - Airtime (ZAR currency) - uses airtime_usage field
 * - Data (MB consumed) - uses data_usage field
 */

/**
 * Generic function to fetch all historical usage data
 * Supports both airtime (ZAR) and data (MB) tracking
 *
 * @param {string} usageType - Either 'airtime' or 'data'
 */
function fetchAllHistoricalUsage(usageType) {
  var START_TIME = new Date().getTime();
  var MAX_DURATION_MS = 5.2 * 60 * 1000; // 5.2 minutes (safe buffer before 6min timeout)

  // Validate usage type
  if (usageType !== 'airtime' && usageType !== 'data') {
    Logger.logError('Invalid usageType. Must be "airtime" or "data"');
    return;
  }

  // Get configuration for this usage type
  var config = Config.get();
  var integrationConfig = config.integrations[usageType];

  if (!integrationConfig || !integrationConfig.enabled) {
    Logger.log(usageType + ' integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      usageType.charAt(0).toUpperCase() + usageType.slice(1) + ' tracking is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  // Check if rate limit is still active
  RateLimiter.checkAppsScriptQuotaReset();
  if (!RateLimiter.checkAndWait()) {
    Logger.log('Rate limit still in effect for ' + usageType);
    return;
  }

  var sheetName = integrationConfig.sheetName;
  var startDateStr = integrationConfig.startDate || config.defaults.startDate;
  var excludedMsisdns = integrationConfig.excludedMsisdns || [];
  var fieldName = usageType === 'airtime' ? 'airtime_usage' : 'data_usage';

  Logger.log('Starting ' + usageType + ' historical fetch from ' + startDateStr);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Get SIMs
  var sims = getActiveSIMs();
  if (!sims || sims.length === 0) {
    Logger.logError('No SIMs retrieved for ' + usageType);
    return;
  }

  // Filter out excluded MSISDNs
  if (excludedMsisdns.length > 0) {
    var excludedSet = {};
    for (var i = 0; i < excludedMsisdns.length; i++) {
      excludedSet[excludedMsisdns[i]] = true;
    }
    var originalCount = sims.length;
    sims = sims.filter(function(sim) {
      return !excludedSet[sim.msisdn];
    });
    Logger.log('Filtered out ' + (originalCount - sims.length) + ' excluded MSISDNs');
  }

  Logger.log('Processing ' + sims.length + ' SIMs for ' + usageType);

  // Step 1: Initialize header
  var header = [];
  var existingCols = sheet.getLastColumn();
  if (existingCols > 0) {
    header = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  }
  if (header.length === 0 || header[0] !== 'Date') {
    header = ['Date'];
    sheet.getRange(1, 1, 1, 1).setValues([header]);
    Logger.log('Initialized ' + usageType + ' sheet with Date column');
  }

  // Step 2: Build column map
  var simColumnMap = {};
  for (var i = 0; i < header.length; i++) {
    if (header[i] !== 'Date') {
      simColumnMap[header[i]] = i + 1;
    }
  }

  // Step 3: Add new SIMs to header
  var headerUpdated = false;
  for (var i = 0; i < sims.length; i++) {
    var sim = sims[i];
    var label = sim.msisdn || sim.iccid || sim.imsi;
    if (!simColumnMap[label]) {
      header.push(label);
      simColumnMap[label] = header.length;
      headerUpdated = true;
    }
  }
  if (headerUpdated) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    Logger.log('Header updated with ' + (header.length - 1) + ' SIMs');
  }

  // Step 4: Read existing dates
  var dateSet = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var dateRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < dateRange.length; i++) {
      var dateObj = dateRange[i][0];
      if (dateObj instanceof Date) {
        var dateStr = Utilities.formatDate(dateObj, 'GMT', 'yyyy-MM-dd');
        dateSet[dateStr] = true;
      }
    }
  }

  // Step 5: Get persisted start date if exists
  var persistedDate = PropertiesService.getScriptProperties().getProperty('LAST_PROCESSED_DATE_' + usageType.toUpperCase());
  if (persistedDate) {
    var persistedDateObj = new Date(persistedDate + 'T00:00:00Z');
    persistedDateObj.setDate(persistedDateObj.getDate() + 1); // Start from next day
    startDateStr = Utilities.formatDate(persistedDateObj, 'GMT', 'yyyy-MM-dd');
    Logger.log('Resuming from persisted date: ' + startDateStr);
  }

  // Step 6: Iterate through dates
  var startDate = new Date(startDateStr + 'T00:00:00Z');
  var endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday

  Logger.log('Fetching ' + usageType + ' from ' + Utilities.formatDate(startDate, 'GMT', 'yyyy-MM-dd') +
             ' to ' + Utilities.formatDate(endDate, 'GMT', 'yyyy-MM-dd'));

  for (var currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    var dateStr = Utilities.formatDate(currentDate, 'GMT', 'yyyy-MM-dd');

    if (dateSet[dateStr]) {
      Logger.log('Skipping existing date: ' + dateStr);
      continue;
    }

    var row = [];
    for (var i = 0; i < header.length; i++) {
      row.push(0);
    }
    row[0] = dateStr;

    // Fetch usage for each SIM
    for (var i = 0; i < sims.length; i++) {
      var sim = sims[i];

      // Check for cancellation
      if (PropertiesService.getScriptProperties().getProperty('CANCEL_SIM_JOB') === 'true') {
        Logger.log('⏹ Execution cancelled by user');
        PropertiesService.getScriptProperties().deleteProperty('CANCEL_SIM_JOB');
        return;
      }

      // Check if rate limit was hit
      if (PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_HIT') === 'true') {
        Logger.log('🚫 Rate limit hit. Exiting early');
        return;
      }

      var identifier = sim.msisdn || sim.iccid || sim.imsi;
      var paramName = sim.msisdn ? 'msisdn' : (sim.iccid ? 'iccid' : 'imsi');
      var label = identifier;

      // Build endpoint with query params
      var endpoint = '/usage-details?' +
        paramName + '=' + encodeURIComponent(identifier) +
        '&start_date=' + dateStr +
        '&end_date=' + dateStr;

      var usageDetails = SimControlAPI.call(endpoint, 'GET', null);

      var usageValue = 0;
      if (usageDetails && usageDetails.data && usageDetails.data[dateStr]) {
        usageValue = usageDetails.data[dateStr][fieldName] || 0;
      }

      var colIdx = simColumnMap[label];
      if (colIdx) {
        row[colIdx - 1] = usageValue;
      }
    }

    // Write row to sheet
    sheet.appendRow(row);
    dateSet[dateStr] = true;
    Logger.log('✅ Wrote ' + usageType + ' for ' + dateStr);
    PropertiesService.getScriptProperties().setProperty('LAST_PROCESSED_DATE_' + usageType.toUpperCase(), dateStr);

    // Check execution time
    var elapsed = new Date().getTime() - START_TIME;
    if (elapsed > MAX_DURATION_MS) {
      Logger.log('⏰ Approaching execution time limit. Scheduling continuation...');
      var functionName = usageType === 'airtime' ? 'fetchAirtimeUsage' : 'fetchDataUsage';
      scheduleNextHistoricalRun(functionName, 10);
      return;
    }
  }

  // Cleanup
  PropertiesService.getScriptProperties().deleteProperty('LAST_PROCESSED_DATE_' + usageType.toUpperCase());
  Logger.log('✅ Completed full ' + usageType + ' history fetch');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'All historical ' + usageType + ' data has been fetched!',
    '✅ Complete',
    5
  );
}


/**
 * Fetch airtime usage (wrapper)
 */
function fetchAirtimeUsage() {
  Logger.log('=== Starting Airtime Usage Fetch ===');
  fetchAllHistoricalUsage('airtime');
}


/**
 * Fetch data usage (wrapper)
 */
function fetchDataUsage() {
  Logger.log('=== Starting Data Usage Fetch ===');
  fetchAllHistoricalUsage('data');
}


/**
 * Fetch previous day usage (generic)
 * @param {string} usageType - Either 'airtime' or 'data'
 */
function fetchPreviousDayUsage(usageType) {
  var START_TIME = new Date().getTime();
  var MAX_DURATION_MS = 5.2 * 60 * 1000; // 5.2 minutes (safe buffer before 6min timeout)

  // Validate usage type
  if (usageType !== 'airtime' && usageType !== 'data') {
    Logger.logError('Invalid usageType. Must be "airtime" or "data"');
    return;
  }

  // Get configuration
  var config = Config.get();
  var integrationConfig = config.integrations[usageType];

  if (!integrationConfig || !integrationConfig.enabled) {
    Logger.log(usageType + ' integration is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      usageType.charAt(0).toUpperCase() + usageType.slice(1) + ' tracking is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var sheetName = integrationConfig.sheetName;
  var excludedMsisdns = integrationConfig.excludedMsisdns || [];
  var fieldName = usageType === 'airtime' ? 'airtime_usage' : 'data_usage';

  Logger.log('Fetching previous day ' + usageType + ' usage');

  var sheet = SheetHelpers.getOrCreateSheet(sheetName);

  // Get SIMs
  var sims = getActiveSIMs();
  if (!sims || sims.length === 0) {
    Logger.logError('No SIMs retrieved for ' + usageType);
    return;
  }

  // Filter out excluded MSISDNs
  if (excludedMsisdns.length > 0) {
    var excludedSet = {};
    for (var i = 0; i < excludedMsisdns.length; i++) {
      excludedSet[excludedMsisdns[i]] = true;
    }
    sims = sims.filter(function(sim) {
      return !excludedSet[sim.msisdn];
    });
  }

  Logger.log('Total managed SIMs to process: ' + sims.length);

  // Ensure header exists and build column map
  var header = [];
  var existingCols = sheet.getLastColumn();
  if (existingCols > 0) {
    header = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  }
  if (header.length === 0 || header[0] !== 'Date') {
    header = ['Date'];
    sheet.getRange(1, 1, 1, 1).setValues([header]);
    Logger.log('Initialized ' + usageType + ' sheet header');
  }

  // Build column map
  var simColumnMap = {};
  for (var i = 0; i < header.length; i++) {
    if (header[i] !== 'Date') {
      simColumnMap[header[i]] = i + 1;
    }
  }

  // Add new SIMs to header if needed
  var headerUpdated = false;
  for (var i = 0; i < sims.length; i++) {
    var sim = sims[i];
    var label = sim.msisdn || sim.iccid || sim.imsi;
    if (!simColumnMap[label]) {
      header.push(label);
      simColumnMap[label] = header.length;
      headerUpdated = true;
    }
  }
  if (headerUpdated) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    Logger.log('Header updated with new SIMs');
  }

  // Get yesterday's date
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var dateStr = Utilities.formatDate(yesterday, 'GMT', 'yyyy-MM-dd');

  Logger.log('Fetching usage for: ' + dateStr);

  // Check if resuming from a previous run
  var persistedData = PropertiesService.getScriptProperties().getProperty('PREVIOUS_DAY_PROGRESS_' + usageType.toUpperCase());
  var processedSimsSet = {};
  var targetRow = null;
  var isResume = false;

  if (persistedData) {
    try {
      var progress = JSON.parse(persistedData);
      if (progress.date === dateStr) {
        processedSimsSet = progress.processedSims || {};
        targetRow = progress.rowIndex;
        isResume = true;
        Logger.log('⏭ Resuming from previous run. Already processed: ' + Object.keys(processedSimsSet).length + ' SIMs');
      }
    } catch (e) {
      Logger.logError('Failed to parse persisted progress, starting fresh', e);
    }
  }

  // Find or create the row for this date
  if (!isResume) {
    // Check if row already exists for this date
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var dateRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < dateRange.length; i++) {
        var cellDate = dateRange[i][0];
        if (cellDate instanceof Date) {
          var cellDateStr = Utilities.formatDate(cellDate, 'GMT', 'yyyy-MM-dd');
          if (cellDateStr === dateStr) {
            targetRow = i + 2; // +2 because of header and 0-based index
            Logger.log('Found existing row for ' + dateStr + ' at row ' + targetRow);
            break;
          }
        }
      }
    }

    // If no existing row, create one
    if (!targetRow) {
      var row = [];
      for (var i = 0; i < header.length; i++) {
        row.push(0);
      }
      row[0] = dateStr;
      sheet.appendRow(row);
      targetRow = sheet.getLastRow();
      Logger.log('Created new row for ' + dateStr + ' at row ' + targetRow);
    }
  }

  // Fetch usage for each SIM
  var simsProcessed = 0;
  for (var i = 0; i < sims.length; i++) {
    var sim = sims[i];
    var identifier = sim.msisdn || sim.iccid || sim.imsi;
    var label = identifier;

    // Skip if already processed
    if (processedSimsSet[label]) {
      Logger.log('Skipping already processed SIM: ' + label);
      continue;
    }

    // Check for cancellation
    if (PropertiesService.getScriptProperties().getProperty('CANCEL_SIM_JOB') === 'true') {
      Logger.log('⏹ Execution cancelled by user');
      PropertiesService.getScriptProperties().deleteProperty('CANCEL_SIM_JOB');
      PropertiesService.getScriptProperties().deleteProperty('PREVIOUS_DAY_PROGRESS_' + usageType.toUpperCase());
      return;
    }

    // Check if rate limit was hit
    if (PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_HIT') === 'true') {
      Logger.log('🚫 Rate limit hit. Exiting early');
      return;
    }

    var paramName = sim.msisdn ? 'msisdn' : (sim.iccid ? 'iccid' : 'imsi');

    // Build endpoint
    var endpoint = '/usage-details?' +
      paramName + '=' + encodeURIComponent(identifier) +
      '&start_date=' + dateStr +
      '&end_date=' + dateStr;

    var usageDetails = SimControlAPI.call(endpoint, 'GET', null);

    var usageValue = 0;
    if (usageDetails && usageDetails.data && usageDetails.data[dateStr]) {
      usageValue = usageDetails.data[dateStr][fieldName] || 0;
    }

    var colIdx = simColumnMap[label];
    if (colIdx) {
      // Write directly to the cell
      sheet.getRange(targetRow, colIdx).setValue(usageValue);
      simsProcessed++;

      // Mark as processed
      processedSimsSet[label] = true;

      // Save progress after each SIM
      PropertiesService.getScriptProperties().setProperty(
        'PREVIOUS_DAY_PROGRESS_' + usageType.toUpperCase(),
        JSON.stringify({
          date: dateStr,
          rowIndex: targetRow,
          processedSims: processedSimsSet
        })
      );

      if (simsProcessed % 10 === 0) {
        Logger.log('Progress: ' + simsProcessed + '/' + sims.length + ' SIMs processed');
      }
    }

    // Check execution time after each SIM
    var elapsed = new Date().getTime() - START_TIME;
    if (elapsed > MAX_DURATION_MS) {
      Logger.log('⏰ Approaching execution time limit. Scheduling continuation...');
      Logger.log('Processed ' + simsProcessed + ' SIMs. Remaining: ' + (sims.length - Object.keys(processedSimsSet).length));

      var functionName = usageType === 'airtime' ? 'fetchPreviousDayAirtime' : 'fetchPreviousDayData';
      scheduleNextHistoricalRun(functionName, 10);
      return;
    }
  }

  // Cleanup - all SIMs processed
  PropertiesService.getScriptProperties().deleteProperty('PREVIOUS_DAY_PROGRESS_' + usageType.toUpperCase());
  Logger.log('✅ Completed processing all ' + sims.length + ' SIMs for ' + dateStr);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Previous day ' + usageType + ' usage fetched successfully (' + sims.length + ' SIMs)',
    '✅ Done',
    5
  );
}


/**
 * Fetch previous day airtime (wrapper)
 */
function fetchPreviousDayAirtime() {
  Logger.log('=== Fetching Previous Day Airtime ===');
  fetchPreviousDayUsage('airtime');
}


/**
 * Fetch previous day data (wrapper)
 */
function fetchPreviousDayData() {
  Logger.log('=== Fetching Previous Day Data ===');
  fetchPreviousDayUsage('data');
}


/**
 * Clear airtime sheet
 */
function clearAirtimeSheet() {
  var config = Config.get();
  var airtimeConfig = config.integrations.airtime;

  if (!airtimeConfig || !airtimeConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Airtime integration is not enabled', '⚠️ Not Enabled', 5);
    return;
  }

  var sheetName = airtimeConfig.sheetName;
  SheetHelpers.clearSheetData(sheetName);

  Logger.log('Airtime sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('Airtime sheet cleared!', '✅ Done', 5);
}


/**
 * Clear data sheet
 */
function clearDataSheet() {
  var config = Config.get();
  var dataConfig = config.integrations.data;

  if (!dataConfig || !dataConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Data integration is not enabled', '⚠️ Not Enabled', 5);
    return;
  }

  var sheetName = dataConfig.sheetName;
  SheetHelpers.clearSheetData(sheetName);

  Logger.log('Data sheet cleared: ' + sheetName);
  SpreadsheetApp.getActiveSpreadsheet().toast('Data sheet cleared!', '✅ Done', 5);
}


/**
 * Cancel any running job
 */
function cancelExecution() {
  PropertiesService.getScriptProperties().setProperty('CANCEL_SIM_JOB', 'true');
  SpreadsheetApp.getActiveSpreadsheet().toast('⏹ Execution will stop soon', 'Cancel Requested', 5);
  Logger.log('User requested script cancellation');
}
