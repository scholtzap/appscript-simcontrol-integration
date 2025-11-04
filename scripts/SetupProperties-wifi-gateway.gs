/**
 * Setup Script Properties for wifi-gateway
 *
 * USAGE:
 * 1. Open WiFi Gateways Provisioning spreadsheet
 * 2. Extensions → Apps Script
 * 3. Create new file or paste into existing file
 * 4. Run setupPropertiesWifiGateway()
 * 5. Check the alert message for confirmation
 *
 * This will set all 21 script properties needed for the new codebase.
 */

function setupPropertiesWifiGateway() {
  var properties = PropertiesService.getScriptProperties();

  // Define all properties based on deployments/wifi-gateway/config.json
  // CORRECTED: wifi-gateway only fetches SIM Details (not data usage)
  var config = {
    "SIMCONTROL_API_KEY": "tms6eKKYRJnLlvhr8YRXj-p-N3AeIP-i3_CUwoS-X8xLgXWVEGNgS38XT0YVcREh3OOCRMNOr-DMcfEHFker1g",
    "DEFAULT_START_DATE": "2025-06-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "false",
    "ENABLE_DATA": "false",
    "ENABLE_RECHARGES": "false",

    "ENABLE_PRODUCTS": "false",

    "ENABLE_SIM_DETAILS": "true",
    "SIM_DETAILS_SHEET_NAME": "[API] SimControl Data",

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
