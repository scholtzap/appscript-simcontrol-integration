/**
 * Pre-Deployment Audit Script
 *
 * PURPOSE: Run this script in existing production Google Sheets BEFORE deploying new code
 *
 * USAGE:
 * 1. Open the production Google Sheet in browser
 * 2. Extensions → Apps Script
 * 3. Create new file or paste into existing code
 * 4. Run auditCurrentState() function
 * 5. Review [AUDIT] Pre-Deployment sheet that gets created
 * 6. Save/export the audit report for records
 *
 * WHAT IT DOES:
 * - Documents all sheet tabs and their row/column counts
 * - Exports all script properties (for backup)
 * - Lists all active triggers
 * - Creates an audit report sheet for review
 *
 * @version 1.0
 * @date 2025-11-04
 */

 // Non-blocking UI notifier. Falls back to Logger if UI is unavailable.
function safeAlert(msg) {
  try {
    const ui = SpreadsheetApp.getUi();
    // Keep alerts short & non-blocking: use toast instead of modal alert
    SpreadsheetApp.getActiveSpreadsheet().toast(String(msg).slice(0, 500), 'Audit', 5);
  } catch (e) {
    // Likely running in a context without UI
    Logger.log('[AUDIT] ' + msg);
  }
}

// Simple time budget guard for sections that may run long
function withTimeBudget(maxMs, fn, onTimeout) {
  const start = Date.now();
  const result = fn(() => (Date.now() - start) < maxMs);
  if ((Date.now() - start) >= maxMs && typeof onTimeout === 'function') onTimeout();
  return result;
}


/**
 * MAIN AUDIT FUNCTION - Runs all audit sections
 * Run this in the CURRENT (legacy) script before deployment
 * Paste into Apps Script editor and run once
 */
function auditCurrentState() {
  var report = [];

  // Run each section independently
  report.push(auditBasicInfo());
  report.push('');
  report.push(auditSheets());
  report.push('');
  report.push(auditScriptProperties());
  report.push('');
  report.push(auditTriggers());

  // Build final text
  var reportText = report.join('\n');

  // Create (or recreate) the audit sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = ss.getSheetByName('[AUDIT] Pre-Deployment');
  if (auditSheet) ss.deleteSheet(auditSheet);
  auditSheet = ss.insertSheet('[AUDIT] Pre-Deployment');

  // --- Write line-by-line to avoid formula parsing ---
  var lines = reportText.split('\n').map(function(line) { return [line]; });
  var rng = auditSheet.getRange(1, 1, lines.length, 1);
  rng.setNumberFormat('@STRING@');   // Force plain text
  rng.setValues(lines);
  auditSheet.getRange('A1:A' + lines.length).setWrap(true);
  auditSheet.setColumnWidth(1, 900);
  // ---------------------------------------------------

  Logger.log(reportText);
  safeAlert('✅ Audit complete. See [AUDIT] Pre-Deployment sheet.');

  return reportText;
}

/**
 * Audit Section 1: Basic spreadsheet info
 * Can be run independently
 */
function auditBasicInfo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];

  report.push('=== PRE-DEPLOYMENT AUDIT REPORT ===');
  report.push('Date: ' + new Date().toISOString());
  report.push('Spreadsheet ID: ' + ss.getId());
  report.push('Spreadsheet Name: ' + ss.getName());

  var output = report.join('\n');
  Logger.log(output);
  safeAlert(output);
  return output;
}

/**
 * Audit Section 2: List all sheets
 * Can be run independently
 */
function auditSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var report = [];

  report.push('=== SHEETS ===');
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    report.push('- ' + sheet.getName() + ' (rows: ' + sheet.getLastRow() + ', cols: ' + sheet.getLastColumn() + ')');
  }

  var output = report.join('\n');
  Logger.log(output);
  safeAlert(output);
  return output;
}

/**
 * Audit Section 3: List script properties
 * Can be run independently
 */
function auditScriptProperties() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var report = [];

  report.push('=== SCRIPT PROPERTIES ===');
  var count = 0;
  for (var key in props) {
    report.push('- ' + key + ' = ' + props[key]);
    count++;
  }

  if (count === 0) {
    report.push('No script properties found');
  }

  var output = report.join('\n');
  Logger.log(output);
  safeAlert(output);
  return output;
}

/**
 * Audit Section 4: List triggers (simplified, no details)
 * Can be run independently
 */
/**
 * Audit Section 4: List triggers (robust, time-boxed, non-blocking)
 * REPLACE the entire auditTriggers() function with this one
 */
function auditTriggers() {
  const report = [];
  report.push('=== TRIGGERS ===');

  // Hard cap to avoid stalling (adjust if you like)
  var MAX_SECTION_MS = 10 * 1000; // 10 seconds

  try {
    return withTimeBudget(
      MAX_SECTION_MS,
      // fn: do work while time remains
      function canRun(timeLeft) {
        const triggers = ScriptApp.getProjectTriggers() || [];
        report.push('Total triggers found: ' + triggers.length);
        report.push('');

        if (triggers.length > 0) {
          report.push('Trigger functions:');
          for (var i = 0; i < triggers.length; i++) {
            if (!timeLeft()) {
              report.push('');
              report.push('⏳ Trigger listing truncated to avoid timeout. Remaining triggers omitted.');
              break;
            }
            try {
              var t = triggers[i];
              var funcName = t.getHandlerFunction();
              var type = t.getEventType ? t.getEventType() : 'UNKNOWN_TYPE';
              var descBits = [];

              // Attempt to enrich a little, but keep it cheap
              descBits.push('function=' + funcName);
              if (type) descBits.push('type=' + type);

              // If time allows, try to read minute/hour for time-based triggers (best-effort)
              try {
                // Some trigger types expose more info; avoid deep calls to stay fast
                // We won't call heavy getters here to keep it snappy
              } catch (_) {}

              report.push('  ' + (i + 1) + '. ' + descBits.join(', '));
            } catch (eInner) {
              report.push('  ' + (i + 1) + '. [Error reading trigger: ' + eInner.message + ']');
            }
          }
          report.push('');
          report.push('NOTE: For full details, open Apps Script → Triggers (clock icon).');
        }

        const output = report.join('\n');
        Logger.log(output);
        // Use non-blocking toast instead of modal alerts
        safeAlert('Triggers audited: ' + (triggers.length || 0));
        return output;
      },
      // onTimeout:
      function () {
        Logger.log('auditTriggers() hit time budget and exited early by design.');
      }
    );
  } catch (e) {
    report.push('Error accessing triggers: ' + e.message);
    report.push('Please manually check: Apps Script → Triggers');
    const output = report.join('\n');
    Logger.log(output);
    safeAlert('Error while auditing triggers. See log.');
    return output;
  }
}


/**
 * Helper function to disable all triggers
 * Run this AFTER audit and BEFORE deploying new code
 * This prevents old code from running during deployment
 */
function disableAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  safeAlert('All triggers deleted: ' + triggers.length);
}
