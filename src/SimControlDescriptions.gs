// Version: 1.0.0
// SimControlDescriptions - Bulk SIM description updates

/**
 * SimControlDescriptions module provides functions for bulk updating
 * SIM descriptions from a Google Sheet
 */

/**
 * Sanitize description by removing special characters
 * @param {string} description - Raw description text
 * @returns {string} Sanitized description
 */
function sanitizeDescription(description) {
  if (!description) return '';

  // Replace smart quotes and zero-width characters
  var sanitized = description
    .replace(/[""'']/g, '"')  // Replace smart quotes with regular quotes
    .replace(/[\u200B-\u200D\uFEFF]/g, '');  // Remove zero-width characters

  return sanitized.trim();
}


/**
 * Auto-format phone numbers by adding WGID prefix
 * @param {string} description - Description that might be a phone number
 * @returns {string} Formatted description
 */
function autoFormatPhoneNumbers(description) {
  if (!description) return '';

  // Check if description is a phone number pattern (+ followed by 10+ digits)
  if (/^\+\d{10,}$/.test(description)) {
    return 'WGID: ' + description;
  }

  return description;
}


/**
 * Update SIM descriptions from active sheet
 * Reads ICCID from column D and description from column Y
 * Supports continuation for long-running jobs
 */
function updateSimDescriptionsFromSheet() {
  var MAX_DURATION_MS = 4.7 * 60 * 1000; // 4.7 minutes (safe buffer before timeout)
  var START_TIME = new Date().getTime();

  Logger.log('=== Starting Bulk Description Update ===');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('No data rows found in sheet');
    SpreadsheetApp.getActiveSpreadsheet().toast('No data to process', 'ℹ️ Info', 5);
    return;
  }

  // Get persisted row index if exists (for continuation)
  var rowIndex = Number(PropertiesService.getScriptProperties().getProperty('CURRENT_ROW_INDEX')) || 2;
  var updatesCount = 0;
  var errorsCount = 0;

  Logger.log('Processing from row ' + rowIndex + ' to ' + lastRow);

  for (; rowIndex <= lastRow; rowIndex++) {
    // Check for cancellation
    if (PropertiesService.getScriptProperties().getProperty('CANCEL_SIM_JOB') === 'true') {
      Logger.log('⏹ Execution cancelled by user');
      PropertiesService.getScriptProperties().deleteProperty('CANCEL_SIM_JOB');
      PropertiesService.getScriptProperties().deleteProperty('CURRENT_ROW_INDEX');
      return;
    }

    // Get ICCID (column D = 4) and description (column Y = 25)
    var iccid = String(sheet.getRange(rowIndex, 4).getValue()).trim();
    var description = String(sheet.getRange(rowIndex, 25).getValue()).trim();

    // Skip blank rows
    if (!iccid && !description) {
      continue;
    }

    // Skip rows with no ICCID
    if (!iccid) {
      Logger.log('Skipping row ' + rowIndex + ' - no ICCID');
      continue;
    }

    // Sanitize and auto-format description
    var safeDesc = sanitizeDescription(description);
    safeDesc = autoFormatPhoneNumbers(safeDesc);

    Logger.log('Updating ICCID: ' + iccid + ' with description: ' + safeDesc);

    // Build endpoint with ICCID query parameter
    var endpoint = '/sims?iccid=' + encodeURIComponent(iccid);
    var payload = { description: safeDesc };

    try {
      var response = SimControlAPI.call(endpoint, 'PATCH', payload);

      if (response) {
        Logger.log('✅ Updated description for ICCID: ' + iccid);
        updatesCount++;

        // Mark row as processed (optional - add checkmark in column Z)
        sheet.getRange(rowIndex, 26).setValue('✓');
      } else {
        Logger.logError('❌ Failed to update ICCID: ' + iccid);
        errorsCount++;
        sheet.getRange(rowIndex, 26).setValue('✗');
      }

    } catch (e) {
      Logger.logError('❌ Exception while updating ICCID: ' + iccid, e);
      errorsCount++;
      sheet.getRange(rowIndex, 26).setValue('✗');
    }

    // Check execution time
    var elapsed = new Date().getTime() - START_TIME;
    if (elapsed > MAX_DURATION_MS) {
      Logger.log('⏰ Approaching timeout. Saving progress at row ' + (rowIndex + 1));
      PropertiesService.getScriptProperties().setProperty('CURRENT_ROW_INDEX', String(rowIndex + 1));

      // Schedule continuation
      ScriptApp.newTrigger('updateSimDescriptionsFromSheet')
        .timeBased()
        .after(10 * 1000) // 10 seconds
        .create();

      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Processed ' + updatesCount + ' updates. Will continue in 10 seconds...',
        '⏱️ Continuing',
        10
      );

      return;
    }
  }

  // Cleanup - reached end of sheet
  PropertiesService.getScriptProperties().deleteProperty('CURRENT_ROW_INDEX');

  Logger.log('✅ Finished processing. Updates: ' + updatesCount + ', Errors: ' + errorsCount);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Completed! Updated: ' + updatesCount + ', Errors: ' + errorsCount,
    '✅ Done',
    10
  );
}


/**
 * Reset description update progress
 * Clears the persisted row index
 */
function resetDescriptionUpdateProgress() {
  PropertiesService.getScriptProperties().deleteProperty('CURRENT_ROW_INDEX');
  Logger.log('Description update progress reset');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Progress reset. Next run will start from row 2',
    'ℹ️ Reset',
    5
  );
}


/**
 * Get current description update progress
 * @returns {number} Current row index or 2 if not set
 */
function getDescriptionUpdateProgress() {
  var rowIndex = Number(PropertiesService.getScriptProperties().getProperty('CURRENT_ROW_INDEX')) || 2;
  Logger.log('Current description update progress: row ' + rowIndex);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Next update will start from row ' + rowIndex,
    'ℹ️ Progress',
    5
  );
  return rowIndex;
}
