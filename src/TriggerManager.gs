// Version: 1.0.0
// TriggerManager - Manages Apps Script triggers for scheduled operations

/**
 * TriggerManager module provides functions for creating, listing, and deleting
 * Apps Script time-based triggers.
 */

/**
 * Set up daily triggers for enabled integrations
 * Creates triggers for airtime, data, and SIM details based on config
 * Default schedule: 1-2 AM for all daily operations
 */
function setupDailyTriggers() {
  try {
    Logger.log('Setting up daily triggers...');

    var config = Config.get();
    var triggersCreated = [];

    // Delete existing daily triggers first to avoid duplicates
    deleteAllTriggers();

    // Create airtime trigger if enabled (1 AM)
    if (config.integrations.airtime && config.integrations.airtime.enabled) {
      ScriptApp.newTrigger('fetchPreviousDayAirtime')
        .timeBased()
        .atHour(1)
        .everyDays(1)
        .create();

      triggersCreated.push('Airtime (1 AM daily)');
      Logger.log('✅ Created daily trigger for airtime at 1 AM');
    }

    // Create data trigger if enabled (1 AM)
    if (config.integrations.data && config.integrations.data.enabled) {
      ScriptApp.newTrigger('fetchPreviousDayData')
        .timeBased()
        .atHour(1)
        .everyDays(1)
        .create();

      triggersCreated.push('Data (1 AM daily)');
      Logger.log('✅ Created daily trigger for data at 1 AM');
    }

    // Create SIM details trigger if enabled (1 AM)
    if (config.integrations.simDetails && config.integrations.simDetails.enabled) {
      ScriptApp.newTrigger('fetchAllSIMDetails')
        .timeBased()
        .atHour(1)
        .everyDays(1)
        .create();

      triggersCreated.push('SIM Details (1 AM daily)');
      Logger.log('✅ Created daily trigger for SIM details at 1 AM');
    }

    // Show user notification
    if (triggersCreated.length > 0) {
      var message = 'Daily triggers created:\n• ' + triggersCreated.join('\n• ');
      SpreadsheetApp.getActiveSpreadsheet().toast(message, '✅ Triggers Set Up', 10);
      Logger.log('✅ Successfully set up ' + triggersCreated.length + ' daily trigger(s)');
    } else {
      var warningMsg = 'No integrations enabled for daily triggers.';
      SpreadsheetApp.getActiveSpreadsheet().toast(warningMsg, '⚠️ No Triggers Created', 10);
      Logger.log('⚠️ No daily triggers created - no integrations enabled');
    }

    return triggersCreated;

  } catch (e) {
    Logger.logError('Failed to set up daily triggers', e);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error setting up triggers: ' + e.message, '❌ Error', 10);
    throw e;
  }
}


/**
 * Delete all project triggers
 * Useful for cleanup or resetting triggers
 */
function deleteAllTriggers() {
  try {
    Logger.log('Deleting all project triggers...');

    var triggers = ScriptApp.getProjectTriggers();
    var deletedCount = 0;

    for (var i = 0; i < triggers.length; i++) {
      ScriptApp.deleteTrigger(triggers[i]);
      deletedCount++;
    }

    Logger.log('✅ Deleted ' + deletedCount + ' trigger(s)');

    if (deletedCount > 0) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Deleted ' + deletedCount + ' trigger(s)',
        '✅ Triggers Deleted',
        5
      );
    }

    return deletedCount;

  } catch (e) {
    Logger.logError('Failed to delete triggers', e);
    throw e;
  }
}


/**
 * List all active triggers
 * Returns array of trigger information for debugging
 * @returns {Array} Array of trigger info objects
 */
function listActiveTriggers() {
  try {
    Logger.log('Listing active triggers...');

    var triggers = ScriptApp.getProjectTriggers();
    var triggerInfo = [];

    for (var i = 0; i < triggers.length; i++) {
      var trigger = triggers[i];
      var info = {
        handlerFunction: trigger.getHandlerFunction(),
        eventType: trigger.getEventType().toString(),
        uniqueId: trigger.getUniqueId()
      };

      // Get trigger source info
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
        info.triggerSource = 'Time-based';
      } else if (trigger.getEventType() === ScriptApp.EventType.ON_OPEN) {
        info.triggerSource = 'On Open';
      } else {
        info.triggerSource = 'Other';
      }

      triggerInfo.push(info);
      Logger.log('Trigger: ' + info.handlerFunction + ' (' + info.triggerSource + ')');
    }

    Logger.log('✅ Total active triggers: ' + triggerInfo.length);

    // Show results to user
    if (triggerInfo.length > 0) {
      var message = 'Active triggers (' + triggerInfo.length + '):\n';
      for (var j = 0; j < triggerInfo.length; j++) {
        message += '• ' + triggerInfo[j].handlerFunction + ' - ' + triggerInfo[j].triggerSource + '\n';
      }
      SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Active Triggers', 10);
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast('No active triggers found', 'Active Triggers', 5);
    }

    return triggerInfo;

  } catch (e) {
    Logger.logError('Failed to list triggers', e);
    return [];
  }
}


/**
 * Schedule next run for historical data fetching (continuation pattern)
 * Used when execution time limit is approaching and job needs to continue
 * @param {string} functionName - Name of function to call
 * @param {number} delaySeconds - Delay in seconds before next run (default 10)
 */
function scheduleNextHistoricalRun(functionName, delaySeconds) {
  functionName = functionName || 'fetchAllHistoricalUsage';
  delaySeconds = delaySeconds || 10;

  try {
    Logger.log('Scheduling continuation for: ' + functionName + ' in ' + delaySeconds + ' seconds');

    ScriptApp.newTrigger(functionName)
      .timeBased()
      .after(delaySeconds * 1000)
      .create();

    Logger.log('⏭ Scheduled next run of ' + functionName + '() in ' + delaySeconds + ' seconds');

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Job paused due to time limit. Will continue in ' + delaySeconds + ' seconds...',
      '⏱️ Continuing Soon',
      10
    );

    return true;

  } catch (e) {
    Logger.logError('Failed to schedule continuation for ' + functionName, e);
    return false;
  }
}


/**
 * Delete a specific trigger by function name
 * @param {string} functionName - Name of the handler function
 * @returns {number} Number of triggers deleted
 */
function deleteThisTrigger(functionName) {
  if (!functionName) {
    Logger.logError('deleteThisTrigger requires a functionName parameter');
    return 0;
  }

  try {
    Logger.log('Deleting trigger(s) for function: ' + functionName);

    var triggers = ScriptApp.getProjectTriggers();
    var deletedCount = 0;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === functionName) {
        ScriptApp.deleteTrigger(triggers[i]);
        deletedCount++;
        Logger.log('Deleted trigger for: ' + functionName);
      }
    }

    if (deletedCount > 0) {
      Logger.log('✅ Deleted ' + deletedCount + ' trigger(s) for ' + functionName);
    } else {
      Logger.log('No triggers found for: ' + functionName);
    }

    return deletedCount;

  } catch (e) {
    Logger.logError('Failed to delete trigger for ' + functionName, e);
    return 0;
  }
}


/**
 * Grant trigger permissions (helper for initial setup)
 * Creates a dummy trigger to prompt for authorization
 */
function grantTriggerPermissions() {
  try {
    Logger.log('Creating dummy trigger to grant permissions...');

    // Create a dummy trigger to prompt for authorization
    var trigger = ScriptApp.newTrigger('dummy')
      .timeBased()
      .after(1 * 60 * 1000)
      .create();

    // Delete it immediately
    ScriptApp.deleteTrigger(trigger);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Trigger permissions granted successfully!',
      '✅ Permissions Granted',
      5
    );

    Logger.log('✅ Trigger permissions granted');

  } catch (e) {
    Logger.logError('Failed to grant trigger permissions', e);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error granting permissions: ' + e.message,
      '❌ Error',
      10
    );
  }
}


/**
 * Dummy function for permission granting
 * This function doesn't do anything but is referenced by grantTriggerPermissions()
 */
function dummy() {
  // This function intentionally left empty
  // Used only for granting trigger permissions
}
