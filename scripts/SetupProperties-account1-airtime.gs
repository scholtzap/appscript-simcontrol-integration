/**
 * Setup Script Properties for account1-airtime
 *
 * USAGE:
 * 1. Open 3BO SIM Data spreadsheet
 * 2. Extensions → Apps Script
 * 3. Create new file or paste into existing file
 * 4. Run setupPropertiesAccount1Airtime()
 * 5. Check the alert message for confirmation
 *
 * This will set all script properties needed for the new codebase.
 */

function setupPropertiesAccount1Airtime() {
  var properties = PropertiesService.getScriptProperties();

  // Define all properties based on deployments/account1-airtime/config.json
  var config = {
    "SIMCONTROL_API_KEY": "Wgmz9JtGy85JjiJg-8eGFJcrJqGSXJfD2-QRS5a9eurf8pN1qwBCdqgtFe3MdlaWYBkv8nGN6WawJgVqmnC-dA",
    "DEFAULT_START_DATE": "2025-01-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "true",
    "AIRTIME_SHEET_NAME": "[API] Airtime Usage",
    "AIRTIME_START_DATE": "2025-01-01",
    "AIRTIME_EXCLUDED_MSISDNS": "[\"27123456789\"]",

    "ENABLE_DATA": "false",
    "ENABLE_RECHARGES": "false",
    "ENABLE_PRODUCTS": "false",
    "ENABLE_SIM_DETAILS": "false",
    "ENABLE_ANALYTICS": "false",
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
