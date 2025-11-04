// Version: 1.0.0
// Logger - Centralized logging to debug sheet

/**
 * Logger namespace for logging to debug sheet
 */
var Logger = (function() {

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {*} data - Optional data to log (will be stringified)
   */
  function log(message, data) {
    logToSheet("INFO", message, data);
    console.log(message, data || "");
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error|*} error - Error object or data
   */
  function logError(message, error) {
    var errorData = error;
    if (error && error.stack) {
      errorData = error.message + "\n" + error.stack;
    }
    logToSheet("ERROR", message, errorData);
    console.error(message, errorData || "");
  }

  /**
   * Write log entry to debug log sheet
   * @param {string} level - Log level (INFO, ERROR, WARN)
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  function logToSheet(level, message, data) {
    try {
      var config = Config.get();
      var logSheetName = config.defaults.logSheetName;
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(logSheetName);

      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = ss.insertSheet(logSheetName);
        sheet.appendRow(["Timestamp", "Level", "Message", "Data"]);
        sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      }

      var timestamp = new Date();
      var dataStr = "";

      if (data !== undefined && data !== null) {
        if (typeof data === "object") {
          try {
            dataStr = JSON.stringify(data, null, 2);
          } catch (e) {
            dataStr = String(data);
          }
        } else {
          dataStr = String(data);
        }
      }

      sheet.appendRow([timestamp, level, message, dataStr]);

      // Keep only last 1000 rows to prevent sheet bloat
      var maxRows = 1000;
      var currentRows = sheet.getLastRow();
      if (currentRows > maxRows + 1) { // +1 for header
        sheet.deleteRows(2, currentRows - maxRows - 1);
      }

    } catch (e) {
      // If logging fails, at least log to console
      console.error("Failed to write to log sheet:", e);
      console.log(level, message, data);
    }
  }

  /**
   * Clear the debug log sheet
   */
  function clearDebugLog() {
    try {
      var config = Config.get();
      var logSheetName = config.defaults.logSheetName;
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(logSheetName);

      if (sheet) {
        sheet.clear();
        sheet.appendRow(["Timestamp", "Level", "Message", "Data"]);
        sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
        SpreadsheetApp.getActiveSpreadsheet().toast("Debug log cleared", "Success", 3);
      } else {
        SpreadsheetApp.getActiveSpreadsheet().toast("Debug log sheet not found", "Info", 3);
      }
    } catch (e) {
      SpreadsheetApp.getActiveSpreadsheet().toast("Failed to clear debug log: " + e.message, "Error", 5);
    }
  }

  /**
   * Navigate user to debug log sheet
   */
  function showDebugLog() {
    try {
      var config = Config.get();
      var logSheetName = config.defaults.logSheetName;
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(logSheetName);

      if (sheet) {
        sheet.activate();
        SpreadsheetApp.getActiveSpreadsheet().toast("Showing debug log", "Info", 2);
      } else {
        SpreadsheetApp.getActiveSpreadsheet().toast("Debug log sheet not found. Run a function to create it.", "Info", 5);
      }
    } catch (e) {
      SpreadsheetApp.getActiveSpreadsheet().toast("Failed to show debug log: " + e.message, "Error", 5);
    }
  }

  // Public API
  return {
    log: log,
    logError: logError,
    logToSheet: logToSheet,
    clearDebugLog: clearDebugLog,
    showDebugLog: showDebugLog
  };

})();
