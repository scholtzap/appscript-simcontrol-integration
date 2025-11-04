/**
 * Setup Script Properties for account2-data
 *
 * USAGE:
 * 1. Open Plentify SimControl Data spreadsheet
 * 2. Extensions → Apps Script
 * 3. Create new file or paste into existing file
 * 4. Run setupPropertiesAccount2Data()
 * 5. Check the alert message for confirmation
 *
 * This will set all script properties needed for the new codebase.
 */

function setupPropertiesAccount2Data() {
  var properties = PropertiesService.getScriptProperties();

  // Define all properties based on deployments/account2-data/config.json
  var config = {
    "SIMCONTROL_API_KEY": "tms6eKKYRJnLlvhr8YRXj-p-N3AeIP-i3_CUwoS-X8xLgXWVEGNgS38XT0YVcREh3OOCRMNOr-DMcfEHFker1g",
    "DEFAULT_START_DATE": "2025-01-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "false",

    "ENABLE_DATA": "true",
    "DATA_SHEET_NAME": "[API] Data Usage",
    "DATA_START_DATE": "2025-08-26",
    "DATA_EXCLUDED_MSISDNS": "[]",

    "ENABLE_RECHARGES": "true",
    "RECHARGE_SHEET_NAME": "[API] Recharges",

    "ENABLE_PRODUCTS": "true",
    "PRODUCTS_SHEET_NAME": "[API] Recharge Product IDs",
    "PRODUCTS_NETWORK_IDS": "[10, 11]",
    "PRODUCTS_TYPE": "DATA",

    "ENABLE_SIM_DETAILS": "false",

    "ENABLE_ANALYTICS": "true",
    "ANALYTICS_USAGE_AGE_ENABLED": "false",
    "ANALYTICS_HIGH_USAGE_ENABLED": "true",
    "ANALYTICS_HIGH_USAGE_SHEET": "[APP] High Usage",
    "ANALYTICS_HIGH_USAGE_THRESHOLD": "1500",

    "ENABLE_FOTAWEB": "false",
    "ENABLE_QRCODE": "false"
  };

  // Set all properties
  properties.setProperties(config);

  // Verify and report
  var report = [];
  report.push("✅ Script Properties Set Successfully!");
  report.push("");
  report.push("Total properties set: " + Object.keys(config).length);
  report.push("");
  report.push("Properties configured:");

  for (var key in config) {
    report.push("  ✓ " + key + " = " + config[key]);
  }

  var message = report.join("\n");
  Logger.log(message);
  SpreadsheetApp.getUi().alert(message);

  return "Setup complete!";
}

/**
 * Helper function to view current properties
 */
function viewCurrentProperties() {
  var properties = PropertiesService.getScriptProperties();
  var allProps = properties.getProperties();

  var report = [];
  report.push("=== CURRENT SCRIPT PROPERTIES ===");
  report.push("Total: " + Object.keys(allProps).length);
  report.push("");

  for (var key in allProps) {
    report.push(key + " = " + allProps[key]);
  }

  var message = report.join("\n");
  Logger.log(message);
  SpreadsheetApp.getUi().alert(message);

  return message;
}

/**
 * Helper function to clear all properties (use with caution!)
 */
function clearAllProperties() {
  var properties = PropertiesService.getScriptProperties();
  properties.deleteAllProperties();

  SpreadsheetApp.getUi().alert("All script properties cleared!");
}
