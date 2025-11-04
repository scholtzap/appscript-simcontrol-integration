// Version: 1.0.0
// RateLimiter - API rate limit management

/**
 * RateLimiter namespace for managing API rate limits
 */
var RateLimiter = (function() {

  /**
   * Check if rate limited and wait if needed
   * Returns true if can proceed, false if should exit
   * @returns {boolean} True if can proceed, false if rate limited
   */
  function checkAndWait() {
    checkAppsScriptQuotaReset();

    var props = PropertiesService.getScriptProperties();
    var rateLimitHit = props.getProperty('RATE_LIMIT_HIT');
    var resetTimeStr = props.getProperty('RATE_LIMIT_RESET_TIME');

    if (rateLimitHit === 'true') {
      if (resetTimeStr) {
        var now = new Date();
        var resetTime = new Date(resetTimeStr);

        if (now >= resetTime) {
          // Reset time has passed, clear flag
          clearFlag();
          props.deleteProperty('RATE_LIMIT_RESET_TIME');
          Logger.log('Rate limit reset time passed. Cleared flag.');
          return true;
        } else {
          // Still rate limited
          Logger.log('Still rate limited. Reset time: ' + resetTime.toISOString());
          return false;
        }
      } else {
        // Rate limit hit but no reset time - possibly Apps Script quota
        Logger.log('Rate limit hit (likely Apps Script quota). Check RATE_LIMIT_HIT_TIMESTAMP.');
        return false;
      }
    }

    return true;
  }

  /**
   * Handle 429 rate limit response from API
   * @param {Object} response - HTTP response object
   */
  function handleRateLimit(response) {
    if (!response || response.getResponseCode() !== 429) {
      return;
    }

    var props = PropertiesService.getScriptProperties();
    var headers = response.getHeaders();
    var resetHeader = headers['x-ratelimit-reset'] || headers['X-RateLimit-Reset'];
    var resetTime = resetHeader ? new Date(parseInt(resetHeader) * 1000) : null;

    if (resetTime) {
      props.setProperty('RATE_LIMIT_RESET_TIME', resetTime.toISOString());
      Logger.log('Rate limit hit. Retry after: ' + resetTime.toISOString());
    } else {
      Logger.log('Rate limit hit, but no reset time provided.');
    }

    props.setProperty('RATE_LIMIT_HIT', 'true');
  }

  /**
   * Handle Apps Script quota exceeded error
   * Sets 24-hour cooldown
   * @param {Error} error - Error object
   */
  function handleAppsScriptQuotaError(error) {
    var errorMsg = error.message || String(error);

    if (errorMsg.includes('Service invoked too many times')) {
      var cooldownTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour cooldown
      var props = PropertiesService.getScriptProperties();

      props.setProperty('RATE_LIMIT_HIT', 'true');
      props.setProperty('RATE_LIMIT_HIT_TIMESTAMP', cooldownTime.toISOString());

      Logger.log('Apps Script quota hit. Retry allowed after: ' + cooldownTime.toISOString());
    }
  }

  /**
   * Check if Apps Script quota cooldown has expired
   */
  function checkAppsScriptQuotaReset() {
    var props = PropertiesService.getScriptProperties();
    var hit = props.getProperty('RATE_LIMIT_HIT');
    var hitTimeStr = props.getProperty('RATE_LIMIT_HIT_TIMESTAMP');

    if (hit === 'true' && hitTimeStr) {
      var now = new Date();
      var resetTime = new Date(hitTimeStr);

      if (now >= resetTime) {
        clearFlag();
        props.deleteProperty('RATE_LIMIT_HIT_TIMESTAMP');
        Logger.log('Cooldown over. Cleared RATE_LIMIT_HIT flag.');
      } else {
        Logger.log('Still waiting. Cooldown expires at: ' + resetTime.toISOString());
      }
    }
  }

  /**
   * Clear rate limit flag
   */
  function clearFlag() {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('RATE_LIMIT_HIT');
    Logger.log('Rate limit flag cleared.');
  }

  /**
   * Check if currently rate limited
   * @returns {boolean} True if rate limited, false otherwise
   */
  function isRateLimited() {
    var props = PropertiesService.getScriptProperties();
    return props.getProperty('RATE_LIMIT_HIT') === 'true';
  }

  // Public API
  return {
    checkAndWait: checkAndWait,
    handleRateLimit: handleRateLimit,
    handleAppsScriptQuotaError: handleAppsScriptQuotaError,
    checkAppsScriptQuotaReset: checkAppsScriptQuotaReset,
    clearFlag: clearFlag,
    isRateLimited: isRateLimited
  };

})();
