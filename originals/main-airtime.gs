// ====================================================================================================
// CONFIGURATION
// ====================================================================================================
const START_DATE = '2025-01-01'; // Configurable start date for historical airtime data (used if no more recent data is available)

const EXCLUDED_MSISDNS = [
  ""
];

function copyFOTAtoDeviceSIMAss() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("[IMP] FOTA Web");
  const targetSheet = ss.getSheetByName("[AUTO] Device & SIM Ass.");

  if (!sourceSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("One of the sheets doesn't exist.");
    return;
  }

  // Get values from A2:A (down to last row with data)
  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) return; // No data to copy

  const sourceRange = sourceSheet.getRange("A2:A" + lastRow);
  const values = sourceRange.getValues();

  // Clear old values in target first (optional)
  const targetStartRow = 9;
  const targetRange = targetSheet.getRange(targetStartRow, 1, values.length, 1);
  targetRange.clearContent();

  // Set new values into A9:A of the target sheet
  targetRange.setValues(values);
}

function getLatestPersistedStartDate() {
  const lastDate = PropertiesService.getScriptProperties().getProperty('LAST_PROCESSED_DATE');
  if (lastDate) {
    const next = new Date(`${lastDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const formatted = Utilities.formatDate(next, 'GMT', 'yyyy-MM-dd');
    logToSheet('INFO', `ℹ️ Resuming from persisted LAST_PROCESSED_DATE + 1 = ${formatted}`);
    return formatted;
  } else {
    logToSheet('INFO', `ℹ️ No persisted date found. Using START_DATE = ${START_DATE}`);
    return START_DATE;
  }
}

function checkAppsScriptQuotaReset() {
  const hit = PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_HIT');
  const hitTimeStr = PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_HIT_TIMESTAMP');

  if (hit === 'true' && hitTimeStr) {
    const now = new Date();
    const resetTime = new Date(hitTimeStr);
    if (now >= resetTime) {
      clearRateLimitFlag();
      PropertiesService.getScriptProperties().deleteProperty('RATE_LIMIT_HIT_TIMESTAMP');
      logToSheet('INFO', '✅ Cooldown over. Cleared RATE_LIMIT_HIT flag.');
    } else {
      logToSheet('INFO', `⏳ Still waiting. Cooldown expires at: ${resetTime.toISOString()}`);
    }
  }
}

function scheduleNextHistoricalRun() {
  ScriptApp.newTrigger('fetchAllHistoricalUsage')
    .timeBased()
    .after(10 * 1000) // run again in 10 seconds
    .create();

  logToSheet('INFO', '⏭ Scheduled next run of fetchAllHistoricalUsage() in 10 seconds.');
}

function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('SIMCONTROL_API_KEY');
}

function deleteThisTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const thisFunctionName = 'fetchAllHistoricalUsage';

  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === thisFunctionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

// Automatically find the latest start date if there is one.
function getDynamicStartDate() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('[API] Airtime Usage');
  if (!sheet || sheet.getLastRow() < 2) {
    logToSheet('INFO', `getDynamicStartDate: No data found. Using START_DATE = ${START_DATE}`);
    return START_DATE;
  }

  const dateValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let latestTimestamp = 0;

  for (let i = 0; i < dateValues.length; i++) {
    const val = dateValues[i][0];
    if (val instanceof Date) {
      const time = val.getTime();
      if (time > latestTimestamp) {
        latestTimestamp = time;
        //logToSheet('DEBUG', `getDynamicStartDate: New latest date candidate = ${val.toISOString()}`);
      }
    }
  }

  if (!latestTimestamp) {
    logToSheet('INFO', `getDynamicStartDate: No valid dates found. Using START_DATE = ${START_DATE}`);
    return START_DATE;
  }

  const nextDate = new Date(latestTimestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + 2); // FOR SOME OBSCURE REASON the script returns the latest day at 00:00 - 2hrs so it gives the previous to last day, meaning we have to increment by 2 not 1 for the next day.

  const formatted = Utilities.formatDate(nextDate, 'GMT', 'yyyy-MM-dd');
  logToSheet('INFO', `getDynamicStartDate: Latest logged = ${new Date(latestTimestamp).toISOString()}, Returning next date = ${formatted}`);
  return formatted;
}

function clearAirtimeUsage() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("[API] Airtime Usage");
  if (sheet) {
    sheet.clear();
    sheet.appendRow(["Date"]);
    SpreadsheetApp.getActiveSpreadsheet().toast("🧹 Airtime Usage cleared!", "✅ Done");
    logToSheet('INFO', 'Airtime Usage sheet cleared and reinitialized');
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast("⚠️ Airtime Usage sheet not found.", "❌ Error");
    logToSheet('WARN', 'Attempted to clear Airtime Usage, but sheet not found');
  }
}

function ensureAirtimeUsageHeader(sheet, sims) {
  let header = [];
  const existingCols = sheet.getLastColumn();

  if (existingCols > 0) {
    header = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  }

  if (header.length === 0 || header[0] !== 'Date') {
    header = ['Date'];
    sheet.getRange(1, 1, 1, 1).setValues([header]);
    logToSheet('INFO', 'Initialized Airtime Usage sheet with Date column');
  }

  const simColumnMap = {};
  header.forEach((label, i) => simColumnMap[label] = i + 1);

  let headerUpdated = false;
  for (const sim of sims) {
    const label = sim.msisdn || sim.iccid || sim.imsi;
    if (!simColumnMap[label]) {
      header.push(label);
      simColumnMap[label] = header.length;
      headerUpdated = true;
    }
  }

  if (headerUpdated) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    logToSheet('INFO', 'Header updated with new SIMs');
  }

  return { header, simColumnMap };
}

function logToSheet(level, message) {
  const sheetName = '[APP] Debug Log';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['Timestamp', 'Level', 'Message']);
  }
  sheet.appendRow([new Date(), level, message]);
}

function clearDebugLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("[APP] Debug Log");
  if (sheet) {
    sheet.clear();
    sheet.appendRow(["Timestamp", "Level", "Message"]);
    SpreadsheetApp.getActiveSpreadsheet().toast("🧹 Debug Log cleared!", "✅ Done");
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast("⚠️ Debug Log sheet not found.", "❌ Error");
  }
}

function callSimControlAPI(endpoint, params = {}) {
  const baseUrl = 'https://app.simcontrol.co.za/api';
  const queryString = Object.keys(params).map(key =>
    encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  ).join('&');
  const url = baseUrl + endpoint + (queryString ? '?' + queryString : '');

  const options = {
    method: 'get',
    headers: {
      'x-api-key': getApiKey(),
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    // logToSheet('INFO', `Calling API: ${url}`);
    const response = UrlFetchApp.fetch(url, options);
    const status = response.getResponseCode();
    const text = response.getContentText();

    // ✅ Rate limit handling FIRST
    if (status === 429) {
      const resetHeader = response.getHeaders()['x-ratelimit-reset'];
      const resetTime = resetHeader ? new Date(parseInt(resetHeader) * 1000) : null;

      if (resetTime) {
        PropertiesService.getScriptProperties().setProperty('RATE_LIMIT_RESET_TIME', resetTime.toISOString());
        logToSheet('WARN', `🚫 Rate limit hit. Retry after: ${resetTime.toISOString()}`);
      } else {
        logToSheet('WARN', '🚫 Rate limit hit, but no reset time provided.');
      }

      PropertiesService.getScriptProperties().setProperty('RATE_LIMIT_HIT', 'true');
      return null;
    }

    // General non-200 response (excluding 429)
    if (status !== 200) {
      logToSheet('ERROR', `API error (${status}): ${text}`);
      return null;
    }

    return JSON.parse(text);
  } catch (error) {
    const errorMsg = String(error);
    logToSheet('ERROR', `Exception during API call to ${url}: ${errorMsg}`);

    if (errorMsg.includes('Service invoked too many times')) {
    const cooldownTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour cooldown
    PropertiesService.getScriptProperties().setProperty('RATE_LIMIT_HIT', 'true');
    PropertiesService.getScriptProperties().setProperty('RATE_LIMIT_HIT_TIMESTAMP', cooldownTime.toISOString());
    logToSheet('WARN', `🚫 Apps Script internal quota hit. Retry allowed after: ${cooldownTime.toISOString()}`);
    }

    return null;
  }
}

// ====================================================================================================
// SIM RETRIEVAL
// ====================================================================================================

function getActiveSIMs() {
  const sims = [];
  let page = 1;
  while (true) {
    const response = callSimControlAPI('/sims', {
      page,
      page_size: 100,
      managed: 'active' // Include suspended SIMs
      // "active"    – Returns only actively managed SIMs (default behavior).
      // "suspended" – Returns only suspended SIMs.
      // "all"       – Returns all SIMs, regardless of status
    });
    if (!response || !response.data) {
      logToSheet('ERROR', `Failed to fetch SIMs on page ${page}.`);
      break;
    }
    sims.push(...response.data);
    if (!response.meta || !response.meta['has_next_page?']) break;
    page++;
  }
  // logToSheet('INFO', `Total SIMs fetched (including suspended): ${sims.length}`);
  // return sims;
  
  // Filter out excluded MSISDNs (with + prefix) - ADDED @ 2025-02-06
    const filteredSims = sims.filter(sim => {
    const msisdn = sim.msisdn;
    return !(msisdn && EXCLUDED_MSISDNS.includes(msisdn));
  });

  logToSheet('INFO', `Total SIMs fetched (excluding ${EXCLUDED_MSISDNS.length} exclusions): ${filteredSims.length}`);
  return filteredSims;
}

function getAllSIMs() {
  const sims = [];
  let page = 1;
  while (true) {
    const response = callSimControlAPI('/sims', {
      page,
      page_size: 100,
      managed: 'all' // Include suspended SIMs
    });
    if (!response || !response.data) {
      logToSheet('ERROR', `Failed to fetch SIMs on page ${page}.`);
      break;
    }
    sims.push(...response.data);
    if (!response.meta || !response.meta['has_next_page?']) break;
    page++;
  }

  logToSheet('INFO', `Total SIMs fetched (including suspended): ${sims.length}`);
  return sims;
}

function writeSimInfoToSheet() {
  const sheetName = '[API] SIM Info';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  // Create or clear the sheet
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  // Write headers
  sheet.appendRow(['ICCID', 'Number', 'Description']);

  // Fetch SIMs using existing getAllSIMs function
  const sims = getAllSIMs();
  if (!sims || sims.length === 0) {
    logToSheet('WARN', 'No SIMs returned for [API] SIM Info write');
    return;
  }

  // Write SIM info
  const rows = sims.map(sim => [
    sim.iccid || '',
    sim.msisdn || '',
    sim.description || ''
  ]);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  logToSheet('INFO', `✅ Wrote ${rows.length} SIM records (with description) to [API] SIM Info`);
}

function cancelExecution() {
  PropertiesService.getScriptProperties().setProperty('CANCEL_SIM_JOB', 'true');
  SpreadsheetApp.getActiveSpreadsheet().toast('⏹ Execution will stop soon', 'Cancel Requested');
  logToSheet('INFO', 'User requested script cancellation.');
}

function clearRateLimitFlag() {
  PropertiesService.getScriptProperties().deleteProperty('RATE_LIMIT_HIT');
  SpreadsheetApp.getActiveSpreadsheet().toast("✅ Rate limit flag cleared.");
  logToSheet('INFO', 'RATE_LIMIT_HIT flag manually cleared.');
}

function checkApiRateLimit() {
  const url = 'https://app.simcontrol.co.za/api/organisations/balance'; // lightweight endpoint

  const options = {
    method: 'get',
    headers: {
      'x-api-key': getApiKey(),
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const headers = response.getAllHeaders();
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const resetUnix = headers['x-ratelimit-reset'];

    if (limit && remaining && resetUnix) {
      const resetTime = new Date(parseInt(resetUnix, 10) * 1000);
      const now = new Date();
      const timeDiffSec = Math.round((resetTime - now) / 1000);
      const minutes = Math.floor(timeDiffSec / 60);
      const seconds = timeDiffSec % 60;

      const msg = `🔎 Rate Limit: Used ${limit - remaining} of ${limit}, remaining ${remaining}. Resets at ${resetTime.toISOString()} in ${minutes}m ${seconds}s.`;
      logToSheet('INFO', msg);
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, '📊 API Rate Info');
    } else {
      logToSheet('WARN', 'Could not retrieve rate limit headers. Headers received: ' + JSON.stringify(headers));
    }
  } catch (e) {
    logToSheet('ERROR', `checkApiRateLimit failed: ${e}`);
  }
}

// ==============================================================================================
// FETCH ALL
// ==============================================================================================

function fetchAllHistoricalUsage() {
  const START_TIME = new Date().getTime();
  const MAX_DURATION_MS = 4.5 * 60 * 1000; // 5 minutes (safe buffer before Apps Script timeout)
  
  // Step 0: Check if rate limit is still active
  checkAppsScriptQuotaReset();
  const resetTimeStr = PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_RESET_TIME');
  if (resetTimeStr) {
    const now = new Date();
    const resetTime = new Date(resetTimeStr);
    if (now < resetTime) {
      logToSheet('INFO', `⏳ Rate limit still in effect. Next retry after: ${resetTime.toISOString()}`);
      SpreadsheetApp.getActiveSpreadsheet().toast(`Rate limit in effect until ${resetTime.toLocaleString()}`, '⏳ Wait');
      return;
    } else {
      // Clear flags if window has passed
      clearRateLimitFlag();
      logToSheet('INFO', '✅ Rate limit window passed. Resuming script.');
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('[API] Airtime Usage') || ss.insertSheet('[API] Airtime Usage');

  const sims = getAllSIMs();
  if (!sims || sims.length === 0) {
    logToSheet('ERROR', 'No SIMs retrieved.');
    return;
  }

  // Step 1: Load and initialize header
  let header = [];
  const existingCols = sheet.getLastColumn();
  if (existingCols > 0) {
    header = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  }
  if (header.length === 0 || header[0] !== 'Date') {
    header = ['Date'];
    sheet.getRange(1, 1, 1, 1).setValues([header]);
    logToSheet('INFO', 'Initialized Airtime Usage sheet with Date column');
  }

  // Step 2: Build column map
  const simColumnMap = {};
  header.forEach((label, i) => {
    if (label !== 'Date') simColumnMap[label] = i + 1;
  });
  logToSheet('INFO', 'Column Map Built');

  // Step 3: Add any new SIMs to header
  let headerUpdated = false;
  for (const sim of sims) {
    const label = sim.msisdn || sim.iccid || sim.imsi;
    if (!simColumnMap[label]) {
      header.push(label);
      simColumnMap[label] = header.length;
      headerUpdated = true;
    }
  }
  if (headerUpdated) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    logToSheet('INFO', 'Header updated with new SIMs');
  }

  // Step 4: Read existing dates
  const dateSet = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dateRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    dateRange.forEach(row => {
      const dateObj = row[0];
      if (dateObj instanceof Date) {
        const dateStr = Utilities.formatDate(dateObj, 'GMT', 'yyyy-MM-dd');
        dateSet.add(dateStr);
      }
    });
  }

  // Step 5: Iterate through dates
  //const startDate = new Date(`${getDynamicStartDate()}T00:00:00Z`);
  const startDate = new Date(`${getLatestPersistedStartDate()}T00:00:00Z`);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  let rowIndex = sheet.getLastRow() + 1;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = Utilities.formatDate(d, 'GMT', 'yyyy-MM-dd');
    if (dateSet.has(dateStr)) {
      logToSheet('INFO', `Skipping existing date: ${dateStr}`);
      continue;
    }

    const row = Array(header.length).fill(0);
    row[0] = dateStr;

    for (const sim of sims) {
      if (PropertiesService.getScriptProperties().getProperty('CANCEL_SIM_JOB') === 'true') {
        logToSheet('INFO', '⏹ Execution cancelled by user.');
        PropertiesService.getScriptProperties().deleteProperty('CANCEL_SIM_JOB');
        return;
      }

      if (PropertiesService.getScriptProperties().getProperty('RATE_LIMIT_HIT') === 'true') {
        logToSheet('INFO', '🚫 Rate limit previously hit. Exiting loop early.');
        return;
      }

      const identifier = sim.msisdn || sim.iccid || sim.imsi;
      const paramName = sim.msisdn ? 'msisdn' : (sim.iccid ? 'iccid' : 'imsi');
      const label = identifier;

      const usageDetails = callSimControlAPI('/usage-details', {
        [paramName]: identifier,
        start_date: dateStr,
        end_date: dateStr
      });

      let airtime = 0;
      if (usageDetails && usageDetails.data && usageDetails.data[dateStr]) {
        airtime = usageDetails.data[dateStr].airtime_usage || 0;
      }

      const colIdx = simColumnMap[label];
      if (colIdx) {
        row[colIdx - 1] = airtime;
      }
    }

    sheet.appendRow(row);
    rowIndex++;
    dateSet.add(dateStr);
    logToSheet('INFO', `✅ Wrote airtime for ${dateStr}`);
    PropertiesService.getScriptProperties().setProperty('LAST_PROCESSED_DATE', dateStr);

    // 💡 Only one timeout check AFTER row is committed
    const elapsed = new Date().getTime() - START_TIME;
    if (elapsed > MAX_DURATION_MS) {
      logToSheet('INFO', '⏰ Approaching execution time limit. Scheduling continuation...');
      scheduleNextHistoricalRun();
      checkAppsScriptQuotaReset()
      return;
    }
  }

  logToSheet('INFO', '✅ Completed full airtime history append.');
  checkApiRateLimit();

  if (Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd') === Utilities.formatDate(new Date(endDate.getTime() + 86400000), 'GMT', 'yyyy-MM-dd')) {
    deleteThisTrigger();
    logToSheet('INFO', '📅 All historical data up to yesterday collected. Trigger stopped.');
  }
}

// ==============================================================================================
// FETCH PREVIOUS DAY
// ==============================================================================================

function fetchPreviousDayUsage() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('[API] Airtime Usage');
  if (!sheet) {
    logToSheet('ERROR', 'Airtime Usage sheet not found. Run fetchAllHistoricalUsage() first.');
    return;
  }

  const sims = getActiveSIMs();
  if (!sims || sims.length === 0) {
    logToSheet('ERROR', 'No SIMs retrieved.');
    return;
  }

  const { header, simColumnMap } = ensureAirtimeUsageHeader(sheet, sims);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate());
  const dateStr = Utilities.formatDate(yesterday, 'GMT', 'yyyy-MM-dd');

  logToSheet('INFO', `Fetching usage for previous day: ${dateStr}`);

  const row = Array(header.length).fill(0);
  row[0] = dateStr;

  for (const sim of sims) {
    if (PropertiesService.getScriptProperties().getProperty('CANCEL_SIM_JOB') === 'true') {
      logToSheet('INFO', '⏹ Execution cancelled by user.');
      PropertiesService.getScriptProperties().deleteProperty('CANCEL_SIM_JOB');
      return;
    }

    const identifier = sim.msisdn || sim.iccid || sim.imsi;
    const paramName = sim.msisdn ? 'msisdn' : (sim.iccid ? 'iccid' : 'imsi');
    const label = identifier;

    const usageDetails = callSimControlAPI('/usage-details', {
      [paramName]: identifier,
      start_date: dateStr,
      end_date: dateStr
    });

    let airtime = 0;
    if (usageDetails && usageDetails.data && usageDetails.data[dateStr]) {
      airtime = usageDetails.data[dateStr].airtime_usage || 0;
    }

    const colIdx = simColumnMap[label];
    if (colIdx) {
      row[colIdx - 1] = airtime;
    }
  }

  sheet.appendRow(row);
  logToSheet('INFO', `✅ Appended airtime usage for ${dateStr}`);
}

// ==============================================================================================
// USAGE AGE ANALYSIS
// ==============================================================================================

function generateSIMUsageSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usageSheet = ss.getSheetByName("[API] Airtime Usage");
  let summarySheet = ss.getSheetByName("[APP] Usage Age Analysis");

  // Create the sheet if it doesn't exist
  if (!summarySheet) {
    summarySheet = ss.insertSheet("[APP] Usage Age Analysis");
    summarySheet.appendRow(["MSISDN", "Status", "Last Usage Date", "Days Since Last Usage"]);
  } else {
    // Only clear data rows, not headers or formatting
    if (summarySheet.getLastRow() > 1) {
      summarySheet.getRange(2, 1, summarySheet.getLastRow() - 1, 4).clearContent(); // clear only up to columnD
    }
  }

  const sims = getAllSIMs();
  if (!sims || sims.length === 0) {
    logToSheet('ERROR', 'No SIMs retrieved.');
    return;
  }

  const usageData = usageSheet.getDataRange().getValues();
  const header = usageData[0];
  const dateRows = usageData.slice(1);
  const today = new Date();

  for (const sim of sims) {
    const id = sim.msisdn || sim.iccid || sim.imsi;
    const status = sim.active ? "ACTIVE" : "SUSPENDED";
    const colIndex = header.indexOf(id);
    if (colIndex === -1) continue;

    let lastUsedDate = null;
    for (let i = dateRows.length - 1; i >= 0; i--) {
      const date = dateRows[i][0];
      const value = dateRows[i][colIndex];
      if (value > 0) {
        lastUsedDate = date;
        break;
      }
    }

    let daysAgo = "";
    if (lastUsedDate) {
      const diff = Math.floor((today - new Date(lastUsedDate)) / (1000 * 60 * 60 * 24));
      daysAgo = diff;
    }

    const firstEmptyRow = summarySheet.getRange("A:A").getValues().findIndex(row => !row[0]);
    if (firstEmptyRow === -1) {
      logToSheet('ERROR', 'No empty row found in column A.');
      return;
    }

    summarySheet.getRange(firstEmptyRow + 1, 1, 1, 4).setValues([[
    id,
    status,
    lastUsedDate ? Utilities.formatDate(new Date(lastUsedDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') : "",
    daysAgo]]);
  }

  logToSheet('INFO', '✅ SIM Usage Summary generated.');
}

// ==============================================================================================
// MENU
// ==============================================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧠 SIMcontrol Tools')
    .addItem('⬇️ Download All Airtime Usage History from ' + START_DATE, 'fetchAllHistoricalUsage')
    .addItem('⏱ Fetch Yesterday\'s Usage', 'fetchPreviousDayUsage')
    .addItem('📋 Generate SIM Usage Summary', 'generateSIMUsageSummary')
    .addItem('🤳 Generate Device QR Codes (from active sheet)', 'generateWhatsAppQRCodes')
    .addSeparator()
    .addItem('📥 Fetch All FOTA Devices', 'fetchAllDeviceData')
    .addSeparator()
    .addItem('🛑 Cancel Running Script', 'cancelExecution')
    .addSeparator()
    //.addItem('🧹 Clear Airtime Usage Sheet', 'clearAirtimeUsage')
    .addItem('🧹 Clear Debug Log', 'clearDebugLog')
    .addSeparator()
    .addItem('🧪 Test SimControl API Key', 'testSimcontrolApiKey') 
    .addItem('📊 Check SimControl API Rate Limit', 'checkApiRateLimit')  
    .addSeparator() 
    .addItem('🧪 Test FOTAWEB API Key', 'testFotaWebApiKey')
    .addItem('🏢 Show FOTA Company Info', 'getFotaCompanyInfo')
    .addToUi();
}

// ==============================================================================================
// TEST FUNCTIONS
// ==============================================================================================

function testSimcontrolApiKey() {
  const apiKey = getApiKey();
  if (!apiKey) {
    logToSheet('ERROR', 'API key not found in Script Properties.');
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://app.simcontrol.co.za/api/organisations/balance', {
      method: 'get',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const result = response.getContentText();

    if (statusCode === 200) {
      logToSheet('INFO', 'API key is valid. Balance response: ' + result);
    } else {
      logToSheet('ERROR', `API test failed. Status Code: ${statusCode}, Response: ${result}`);
    }
  } catch (error) {
    logToSheet('ERROR', 'Error making API request: ' + error);
  }
}

function grantTriggerPermissions() {
  ScriptApp.newTrigger('dummy')
    .timeBased()
    .after(1 * 60 * 1000)
    .create();
}
