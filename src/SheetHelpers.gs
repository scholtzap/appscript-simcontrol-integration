// Version: 1.0.0
// SheetHelpers - Sheet manipulation utilities

/**
 * SheetHelpers namespace for sheet operations
 */
var SheetHelpers = (function() {

  /**
   * Get existing sheet or create new one
   * @param {string} sheetName - Name of the sheet
   * @returns {Sheet} Google Sheets Sheet object
   */
  function getOrCreateSheet(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log("Created new sheet: " + sheetName);
    }

    return sheet;
  }

  /**
   * Set proper column headers for usage sheets (airtime or data)
   * @param {Sheet} sheet - Sheet object
   * @param {string} usageType - 'airtime' or 'data'
   */
  function ensureUsageHeader(sheet, usageType) {
    var headers;

    if (usageType === "airtime") {
      headers = ["Date", "MSISDN", "ICCID", "Airtime Usage (ZAR)", "Description"];
    } else if (usageType === "data") {
      headers = ["Date", "MSISDN", "ICCID", "Data Usage (MB)", "Description"];
    } else {
      Logger.logError("Invalid usage type for header: " + usageType);
      return;
    }

    // Only set headers if sheet is empty or first row doesn't match
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      Logger.log("Set headers for " + usageType + " sheet");
    }
  }

  /**
   * Clear sheet data while preserving headers
   * @param {string} sheetName - Name of the sheet to clear
   * @returns {boolean} True if successful, false otherwise
   */
  function clearSheetData(sheetName) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        Logger.logError("Sheet not found: " + sheetName);
        return false;
      }

      var lastRow = sheet.getLastRow();

      if (lastRow > 1) {
        // Delete all rows except header
        sheet.deleteRows(2, lastRow - 1);
        Logger.log("Cleared data from sheet: " + sheetName);
      } else {
        Logger.log("Sheet already empty: " + sheetName);
      }

      return true;
    } catch (e) {
      Logger.logError("Failed to clear sheet: " + sheetName, e);
      return false;
    }
  }

  /**
   * Append rows to sheet in batch for efficiency
   * @param {Sheet} sheet - Sheet object
   * @param {Array<Array>} rows - Array of row arrays to append
   */
  function appendRowsInBatch(sheet, rows) {
    if (!rows || rows.length === 0) {
      return;
    }

    try {
      var lastRow = sheet.getLastRow();
      var numRows = rows.length;
      var numCols = rows[0].length;

      // Insert rows and set values in batch
      sheet.getRange(lastRow + 1, 1, numRows, numCols).setValues(rows);
      Logger.log("Appended " + numRows + " rows to sheet: " + sheet.getName());
    } catch (e) {
      Logger.logError("Failed to append rows in batch", e);
      throw e;
    }
  }

  /**
   * Get or create a Google Drive folder
   * @param {string} folderName - Name of the folder
   * @param {Folder} parentFolder - Optional parent folder (defaults to root)
   * @returns {Folder} Google Drive Folder object
   */
  function getOrCreateFolder(folderName, parentFolder) {
    try {
      var parent = parentFolder || DriveApp.getRootFolder();
      var folders = parent.getFoldersByName(folderName);

      if (folders.hasNext()) {
        return folders.next();
      } else {
        var newFolder = parent.createFolder(folderName);
        Logger.log("Created new folder: " + folderName);
        return newFolder;
      }
    } catch (e) {
      Logger.logError("Failed to get or create folder: " + folderName, e);
      throw e;
    }
  }

  /**
   * Clear entire sheet including headers
   * @param {string} sheetName - Name of the sheet to clear
   * @returns {boolean} True if successful, false otherwise
   */
  function clearEntireSheet(sheetName) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        Logger.logError("Sheet not found: " + sheetName);
        return false;
      }

      sheet.clear();
      Logger.log("Cleared entire sheet: " + sheetName);
      return true;
    } catch (e) {
      Logger.logError("Failed to clear entire sheet: " + sheetName, e);
      return false;
    }
  }

  // Public API
  return {
    getOrCreateSheet: getOrCreateSheet,
    ensureUsageHeader: ensureUsageHeader,
    clearSheetData: clearSheetData,
    appendRowsInBatch: appendRowsInBatch,
    getOrCreateFolder: getOrCreateFolder,
    clearEntireSheet: clearEntireSheet
  };

})();
