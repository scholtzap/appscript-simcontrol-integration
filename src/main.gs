
const START_DATE = '2025-06-01'; // Configurable start date for historical airtime data (used if no more recent data is available)

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

function updateSimDescriptionsFromSheet() {
  const MAX_DURATION_MS = 280000; // ~4.7 minutes
  const START_TIME = new Date().getTime();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();

  let rowIndex = Number(PropertiesService.getScriptProperties().getProperty('CURRENT_ROW_INDEX')) || 2;
  let updatesCount = 0;

  for (; rowIndex <= lastRow; rowIndex++) {
    const iccid = String(sheet.getRange(rowIndex, 4).getValue()).trim();      // Column D
    const description = String(sheet.getRange(rowIndex, 25).getValue()).trim(); // Column Y

    if (!iccid && !description) continue; // skip fully blank rows
    if (!iccid) continue; // skip rows with no ICCID

    // Auto-sanitize
    let safeDesc = description.replace(/[“”‘’]/g, '"').replace(/[\u200B-\u200D\uFEFF]/g, '');
    if (/^\+\d{10,}$/.test(safeDesc)) {
      safeDesc = 'WGID: ' + safeDesc;
    }

    const url = `https://app.simcontrol.co.za/api/sims?iccid=${encodeURIComponent(iccid)}`;
    const payload = { description: safeDesc };

    // logToSheet('DEBUG', `PATCH to ${url} with payload: ${JSON.stringify(payload)}`);

    const options = {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        'x-api-key': getApiKey(),
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const text = response.getContentText();

      if (code === 200 || code === 202) {
        logToSheet('INFO', `✅ Updated description for ICCID: ${iccid}`);
        updatesCount++;
      } else {
        logToSheet('ERROR', `❌ Failed to update ICCID: ${iccid} (Status ${code}) → ${text}`);
      }
    } catch (err) {
      logToSheet('ERROR', `❌ Exception while updating ICCID: ${iccid} - ${err}`);
    }

    // Timeout guard
    if ((new Date().getTime() - START_TIME) > MAX_DURATION_MS) {
      logToSheet('INFO', `⏳ Approaching timeout. Saving row ${rowIndex + 1} and scheduling continuation.`);
      PropertiesService.getScriptProperties().setProperty('CURRENT_ROW_INDEX', rowIndex + 1);
      ScriptApp.newTrigger('updateSimDescriptionsFromSheet')
        .timeBased()
        .after(10 * 1000) // 10 seconds
        .create();
      return;
    }
  }

  // If we got here, we reached end of sheet.
  if (rowsProcessed === 0) {
    logToSheet('INFO', '✅ No more valid rows found. Resetting row index to 2 for future runs.');
  } else {
    logToSheet('INFO', `✅ Finished processing ${rowsProcessed} rows. Total updates: ${updatesCount}`);
  }

  PropertiesService.getScriptProperties().deleteProperty('CURRENT_ROW_INDEX'); // Reset regardless
}

function generateSIMUsageSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const usageSheetName = PropertiesService.getScriptProperties().getProperty('USAGE_SHEET_NAME') || 'SIM Usage';
  const usageSheet = ss.getSheetByName(usageSheetName);

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
    //logToSheet('DEBUG', `SIM ${id} - Status: ${sim.active}, Active Flag: ${sim.active}`);

    //const status = sim.network_status || "UNKNOWN";
    //logToSheet('DEBUG', `SIM ${id} - Status: ${sim.network_status}, Network Flag: ${sim.active}`);

    const colIndex = header.indexOf(id);
    let lastUsedDate = null;
    if (colIndex !== -1) {
      for (let i = dateRows.length - 1; i >= 0; i--) {
        const date = dateRows[i][0];
        const value = dateRows[i][colIndex];
        if (value > 0) {
          lastUsedDate = date;
          break;
        }
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

function fetchPreviousDayUsage() {
  const sheetName = PropertiesService.getScriptProperties().getProperty('USAGE_SHEET_NAME') || 'SIM Usage';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    logToSheet('ERROR', `${sheetName} sheet not found. Run fetchAllHistoricalUsage() first.`);
    SpreadsheetApp.getActiveSpreadsheet().toast(`${sheetName} sheet not found`, '❌ Error');
    return;
  }

  const sims = getActiveSIMs();
  if (!sims || sims.length === 0) {
    logToSheet('ERROR', 'No SIMs retrieved.');
    return;
  }

  const { header, simColumnMap } = ensureUsageHeader(sheet, sims);

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

    let usage = 0;
    if (usageDetails && usageDetails.data && usageDetails.data[dateStr]) {
      usage = usageDetails.data[dateStr].data_usage || 0;
    }

    const colIdx = simColumnMap[label];
    if (colIdx) {
      row[colIdx - 1] = usage;
    }
  }

  sheet.appendRow(row);
  logToSheet('INFO', `✅ Appended ${sheetName} for ${dateStr}`);
}

function createRechargeProductSheet() {
  const sheetName = '[API] Recharge Product IDs';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Clear only the data rows, preserve header
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  const networkIds = [10, 11]; // Define network IDs to include (Vodacom: 2, MTN: 3)
  const productType = 'DATA';
  const allProducts = [];

  for (const networkId of networkIds) {
    let page = 1;
    while (true) {
      const response = callSimControlAPI('/products', {
        page,
        page_size: 100,
        network_id: networkId,
        product_type: productType
      });

      if (!response || !response.data || response.data.length === 0) break;

      allProducts.push(...response.data);
      if (!response.meta || !response.meta['has_next_page?']) break;

      page++;
    }
  }

  if (allProducts.length === 0) {
    SpreadsheetApp.getUi().alert('No DATA products found for MTN or Vodacom.');
    return;
  }

  // Extract and write headers if not present
  const headers = Object.keys(allProducts[0]);
  const existingHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existingHeader[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Write product rows starting from row 2
  const rows = allProducts.map(p => headers.map(h => p[h]));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  SpreadsheetApp.getActiveSpreadsheet().toast(`✅ ${allProducts.length} DATA products loaded`, 'Done');
  logToSheet('INFO', `Fetched and wrote ${allProducts.length} DATA products for MTN & Vodacom to ${sheetName}`);
}

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
