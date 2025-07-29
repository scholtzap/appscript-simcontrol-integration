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

function getDynamicStartDate() {
  const sheetName =
    PropertiesService.getScriptProperties().getProperty('USAGE_SHEET_NAME') ||
  'SIM Usage';

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    logToSheet('INFO', `getDynamicStartDate: No data found in sheet "${sheetName}". Using START_DATE = ${START_DATE}`);
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
      }
    }
  }

  if (!latestTimestamp) {
    logToSheet('INFO', `getDynamicStartDate: No valid dates found in sheet "${sheetName}". Using START_DATE = ${START_DATE}`);
    return START_DATE;
  }

  const nextDate = new Date(latestTimestamp);
  nextDate.setUTCDate(nextDate.getUTCDate() + 2);

  const formatted = Utilities.formatDate(nextDate, 'GMT', 'yyyy-MM-dd');
  logToSheet('INFO', `getDynamicStartDate: Latest logged = ${new Date(latestTimestamp).toISOString()}, Returning next date = ${formatted}`);
  return formatted;
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
    logToSheet('INFO', 'Initialized Usage sheet with Date column');
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

  logToSheet('INFO', `Total SIMs fetched (all): ${sims.length}`);
  return sims;
}

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
  logToSheet('INFO', `Total SIMs fetched (active): ${sims.length}`);
  return sims;
}

function getSuspendedSIMs() {
  const sims = [];
  let page = 1;
  while (true) {
    const response = callSimControlAPI('/sims', {
      page,
      page_size: 100,
      managed: 'suspended' // Include suspended SIMs
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
  logToSheet('INFO', `Total SIMs fetched (suspended): ${sims.length}`);
  return sims;
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
