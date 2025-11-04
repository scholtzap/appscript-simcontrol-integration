// ====================================================================================================
// CONFIGURATION
// ====================================================================================================
const START_DATE = '2025-06-01'; // Configurable start date for historical airtime data (used if no more recent data is available)

function fetchRechargesBetweenDates(startDate, endDate) {
  const apiKey = getApiKey(); // Reuses your existing function
  const baseUrl = 'https://app.simcontrol.co.za/api/recharge';
  const pageSize = 100;
  let page = 1;
  let allRecharges = [];

  while (true) {
    const url = `${baseUrl}?start_date=${startDate}&end_date=${endDate}&page=${page}&page_size=${pageSize}`;
    const options = {
      method: 'get',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const status = response.getResponseCode();
      const body = response.getContentText();
      if (status !== 200) {
        logToSheet('ERROR', `Recharge API failed (${status}): ${body}`);
        break;
      }

      const result = JSON.parse(body);
      if (result && result.data && Array.isArray(result.data)) {
        allRecharges = allRecharges.concat(result.data);
      } else {
        logToSheet('WARN', `Unexpected response format: ${body}`);
        break;
      }

      const hasNext = result.meta && result.meta['has_next_page?'];
      if (!hasNext) break;

      page++;
    } catch (err) {
      logToSheet('ERROR', `Exception during recharge fetch: ${err}`);
      break;
    }
  }

  logToSheet('INFO', `✅ Retrieved ${allRecharges.length} recharges from ${startDate} to ${endDate}`);
  return allRecharges;
}

function fetchUsageForSimOnDate(msisdn, dateStr) {
  const endpoint = '/usage-details';
  const params = {
    msisdn: msisdn,
    start_date: dateStr,
    end_date: dateStr
  };

  const usageDetails = callSimControlAPI(endpoint, params);
  if (!usageDetails || !usageDetails.data || !usageDetails.data[dateStr]) {
    logToSheet('WARN', `No usage found for ${msisdn} on ${dateStr}`);
    return null;
  }

  const data = usageDetails.data[dateStr];
  logToSheet('INFO', `Usage for ${msisdn} on ${dateStr}: Airtime=${data.airtime_usage}, Data=${data.data_usage}, SMS=${data.sms_usage}`);
  return data;
}

function ensureUsageHeader(sheet, sims) {
  let header = [];
  const existingCols = sheet.getLastColumn();

  if (existingCols > 0) {
    header = sheet.getRange(1, 1, 1, existingCols).getValues()[0];
  }

  if (header.length === 0 || header[0] !== 'Date') {
    header = ['Date'];
    sheet.getRange(1, 1, 1, 1).setValues([header]);
    logToSheet('INFO', 'Initialized Data Usage sheet with Date column');
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
  const sheetName = 'Debug Log';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['Timestamp', 'Level', 'Message']);
  }
  sheet.appendRow([new Date(), level, message]);
}

function clearDebugLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Debug Log");
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

function fetchAllHistoricalUsage() {
  const START_TIME = new Date().getTime();
  const MAX_DURATION_MS = 5.2 * 60 * 1000; // 5 minutes (safe buffer before Apps Script timeout)
  
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
  const sheet = ss.getSheetByName('Data Usage') || ss.insertSheet('Data Usage');

  const sims = getActiveSIMs();
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
    logToSheet('INFO', 'Initialized Data Usage sheet with Date column');
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
        airtime = usageDetails.data[dateStr].data_usage || 0;
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

  logToSheet('INFO', '✅ Completed full data history append.');
  checkApiRateLimit();

  if (Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd') === Utilities.formatDate(new Date(endDate.getTime() + 86400000), 'GMT', 'yyyy-MM-dd')) {
    deleteThisTrigger();
    logToSheet('INFO', '📅 All historical data up to yesterday collected. Trigger stopped.');
  }
}
