// Version: 1.0.0
// SimControlSims - SIM retrieval functions

/**
 * SimControlSims module provides functions for retrieving SIMs from SimControl API
 * with automatic pagination handling.
 */

/**
 * Fetch all SIMs (all statuses: MANAGED, PAUSED, STAGED, SUSPENDED)
 * @returns {Array} Array of SIM objects
 */
function getAllSIMs() {
  Logger.log('Fetching all SIMs (status=ALL)...');

  try {
    var sims = SimControlAPI.callWithPagination('/sims', {
      status: 'ALL',
      page_size: 100
    });

    Logger.log('✅ Total SIMs fetched (status=ALL): ' + sims.length);
    return sims;

  } catch (e) {
    Logger.logError('Failed to fetch all SIMs', e);
    return [];
  }
}


/**
 * Fetch only active/managed SIMs
 * @returns {Array} Array of active SIM objects
 */
function getActiveSIMs() {
  Logger.log('Fetching active SIMs...');

  try {
    var sims = SimControlAPI.callWithPagination('/sims', {
      status: 'MANAGED',
      page_size: 100
    });

    Logger.log('✅ Total active SIMs fetched: ' + sims.length);
    return sims;

  } catch (e) {
    Logger.logError('Failed to fetch active SIMs', e);
    return [];
  }
}


/**
 * Fetch only suspended SIMs
 * @returns {Array} Array of suspended SIM objects
 */
function getSuspendedSIMs() {
  Logger.log('Fetching suspended SIMs...');

  try {
    var sims = SimControlAPI.callWithPagination('/sims', {
      status: 'SUSPENDED',
      page_size: 100
    });

    Logger.log('✅ Total suspended SIMs fetched: ' + sims.length);
    return sims;

  } catch (e) {
    Logger.logError('Failed to fetch suspended SIMs', e);
    return [];
  }
}


/**
 * Fetch single SIM details by SIM ID
 * @param {string} simId - The SIM ID to fetch
 * @returns {Object|null} SIM object or null if not found
 */
function getSIMById(simId) {
  if (!simId) {
    Logger.logError('getSIMById requires a simId parameter');
    return null;
  }

  Logger.log('Fetching SIM by ID: ' + simId);

  try {
    var response = SimControlAPI.call('/sims/' + simId, 'GET', null);

    if (response && response.data) {
      Logger.log('✅ Successfully fetched SIM: ' + simId);
      return response.data;
    } else if (response) {
      // If response doesn't have data wrapper, return the response itself
      Logger.log('✅ Successfully fetched SIM: ' + simId);
      return response;
    } else {
      Logger.logError('SIM not found: ' + simId);
      return null;
    }

  } catch (e) {
    Logger.logError('Failed to fetch SIM by ID: ' + simId, e);
    return null;
  }
}


/**
 * Fetch SIM details by ICCID
 * @param {string} iccid - The ICCID to fetch
 * @returns {Object|null} SIM object or null if not found
 */
function getSIMByICCID(iccid) {
  if (!iccid) {
    Logger.logError('getSIMByICCID requires an iccid parameter');
    return null;
  }

  Logger.log('Fetching SIM by ICCID: ' + iccid);

  try {
    var response = SimControlAPI.call('/sims?iccid=' + encodeURIComponent(iccid), 'GET', null);

    if (response && response.data && response.data.length > 0) {
      Logger.log('✅ Successfully fetched SIM by ICCID: ' + iccid);
      return response.data[0];
    } else {
      Logger.logError('SIM not found by ICCID: ' + iccid);
      return null;
    }

  } catch (e) {
    Logger.logError('Failed to fetch SIM by ICCID: ' + iccid, e);
    return null;
  }
}


/**
 * Fetch SIM details by MSISDN (phone number)
 * @param {string} msisdn - The MSISDN to fetch
 * @returns {Object|null} SIM object or null if not found
 */
function getSIMByMSISDN(msisdn) {
  if (!msisdn) {
    Logger.logError('getSIMByMSISDN requires an msisdn parameter');
    return null;
  }

  Logger.log('Fetching SIM by MSISDN: ' + msisdn);

  try {
    var response = SimControlAPI.call('/sims?msisdn=' + encodeURIComponent(msisdn), 'GET', null);

    if (response && response.data && response.data.length > 0) {
      Logger.log('✅ Successfully fetched SIM by MSISDN: ' + msisdn);
      return response.data[0];
    } else {
      Logger.logError('SIM not found by MSISDN: ' + msisdn);
      return null;
    }

  } catch (e) {
    Logger.logError('Failed to fetch SIM by MSISDN: ' + msisdn, e);
    return null;
  }
}
