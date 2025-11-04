const FOTA_BASE_URL = 'https://api.teltonika.lt';
const USER_AGENT = 'YourCompany/FOTAWEB Integration (v1.0)';
const FOTA_SHEET_NAME = '[API] FOTA Web';

/**
 * Helper function to call the FOTA Web API
 */
function callFotaWebAPI(endpoint, method = 'get', payload = null) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('FOTAWEB_API_KEY');
  if (!apiKey) throw new Error('FOTAWEB_API_KEY script property is not set.');

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  const url = `${FOTA_BASE_URL}${endpoint}`;
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const content = response.getContentText();

  logToSheet('INFO', `Request: ${method.toUpperCase()} ${url}`);
  logToSheet('INFO', `Response Code: ${responseCode}`);
  logToSheet('DEBUG', `Response Body: ${content}`);

  if (responseCode === 401) {
    throw new Error('Unauthorized: Check your API token and permissions.');
  }

  if (!content) {
    throw new Error(`Empty response body. Status: ${responseCode}`);
  }

  return JSON.parse(content);
}

function getFotaCompanyInfo() {
  try {
    const response = callFotaWebAPI('/devices?page=1&per_page=1');
    if (Array.isArray(response) && response.length > 0 && response[0].created_by) {
      const createdBy = response[0].created_by;
      const companyId = createdBy.company_id;
      const userEmail = createdBy.email;
      logToSheet('INFO', `✅ FOTA Web Company ID: ${companyId}`);
      logToSheet('INFO', `✅ API User Email: ${userEmail}`);
      SpreadsheetApp.getUi().alert(`Company ID: ${companyId}\nUser Email: ${userEmail}`);
    } else {
      logToSheet('WARN', '⚠️ No device data or company info found.');
      SpreadsheetApp.getUi().alert('⚠️ Could not find company info from API.');
    }
  } catch (error) {
    logToSheet('ERROR', '❌ Error fetching company info: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Failed to fetch company info. See debug log.');
  }
}

/**
 * Fetch all device data and write to "[API] FOTA Web"
 */
function fetchAllDeviceData() {
  const sheet = getOrCreateSheet(FOTA_SHEET_NAME);
  sheet.clearContents();
  const headersSet = new Set();
  let allDevices = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const endpoint = `/devices?page=${page}&per_page=${perPage}`;
    const result = callFotaWebAPI(endpoint);
    if (!result || result.length === 0) break;

    allDevices = allDevices.concat(result);
    result.forEach(device => Object.keys(device).forEach(key => headersSet.add(key)));
    page++;
  }

  const headers = Array.from(headersSet);
  sheet.appendRow(headers);

  allDevices.forEach(device => {
    const row = headers.map(h => device[h] ?? '');
    sheet.appendRow(row);
  });

  logToSheet('INFO', `Fetched and wrote ${allDevices.length} devices to "${FOTA_SHEET_NAME}"`);
}

/**
 * Test API key by hitting a basic endpoint
 */
function testFotaWebApiKey() {
  try {
    const result = callFotaWebAPI('/devices?page=1&per_page=1');
    if (Array.isArray(result)) {
      SpreadsheetApp.getUi().alert('✅ API Key is valid.');
    } else {
      SpreadsheetApp.getUi().alert('❌ API key might be invalid or access is restricted.');
    }
  } catch (e) {
    logToSheet('ERROR', 'Error during API key test: ' + e.toString());
    SpreadsheetApp.getUi().alert('❌ API key test failed. See debug log.');
  }
}

/**
 * Get or create a sheet by name
 */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

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