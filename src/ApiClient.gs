// Version: 1.0.0
// ApiClient - Unified API client with rate limiting and error handling

/**
 * Generic API client
 */
var ApiClient = (function() {

  /**
   * Generic HTTP client with rate limiting and error handling
   * @param {string} baseUrl - Base URL for the API
   * @param {string} endpoint - API endpoint (with leading slash)
   * @param {Object} options - Request options {method, headers, payload, muteHttpExceptions}
   * @returns {Object|null} Parsed JSON response or null on error
   */
  function call(baseUrl, endpoint, options) {
    options = options || {};

    // Check rate limit before making request
    if (!RateLimiter.checkAndWait()) {
      Logger.log('Skipping API call due to rate limit: ' + endpoint);
      return null;
    }

    var url = baseUrl + endpoint;
    var requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      muteHttpExceptions: true
    };

    if (options.payload) {
      requestOptions.payload = JSON.stringify(options.payload);
      requestOptions.headers['Content-Type'] = 'application/json';
    }

    try {
      Logger.log('API Request: ' + requestOptions.method + ' ' + url);

      var response = UrlFetchApp.fetch(url, requestOptions);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();

      Logger.log('API Response Code: ' + responseCode);

      // Handle 429 rate limit
      if (responseCode === 429) {
        RateLimiter.handleRateLimit(response);
        return null;
      }

      // Handle success (2xx)
      if (responseCode >= 200 && responseCode < 300) {
        if (responseText) {
          try {
            return JSON.parse(responseText);
          } catch (e) {
            Logger.logError('Failed to parse JSON response', e);
            return responseText;
          }
        }
        return null;
      }

      // Handle errors (4xx, 5xx)
      Logger.logError('API Error: ' + responseCode + ' - ' + responseText);
      return null;

    } catch (e) {
      Logger.logError('API request failed: ' + url, e);

      // Check for Apps Script quota errors
      RateLimiter.handleAppsScriptQuotaError(e);

      return null;
    }
  }

  return {
    call: call
  };

})();


/**
 * SimControl API client
 */
var SimControlAPI = (function() {

  var BASE_URL = 'https://app.simcontrol.co.za/api';

  /**
   * Call SimControl API
   * @param {string} endpoint - API endpoint (with leading slash)
   * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
   * @param {Object} payload - Request payload (optional)
   * @returns {Object|null} Parsed JSON response or null on error
   */
  function call(endpoint, method, payload) {
    method = method || 'GET';

    var apiKey = Config.getApiKey('simcontrol');
    if (!apiKey) {
      Logger.logError('SimControl API key not configured');
      return null;
    }

    var options = {
      method: method,
      headers: {
        'x-api-key': apiKey
      }
    };

    if (payload) {
      options.payload = payload;
    }

    return ApiClient.call(BASE_URL, endpoint, options);
  }

  /**
   * Call SimControl API with pagination support
   * @param {string} endpoint - API endpoint (without query params)
   * @param {Object} params - Query parameters
   * @returns {Array} Array of all results across pages
   */
  function callWithPagination(endpoint, params) {
    params = params || {};
    var page = params.page || 1;
    var pageSize = params.page_size || 100;
    var allResults = [];
    var hasNextPage = true;

    while (hasNextPage) {
      // Build query string
      var queryParams = Object.assign({}, params, {
        page: page,
        page_size: pageSize
      });

      var queryString = Object.keys(queryParams)
        .map(function(key) {
          return encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]);
        })
        .join('&');

      var fullEndpoint = endpoint + '?' + queryString;
      var response = call(fullEndpoint, 'GET', null);

      if (!response) {
        Logger.logError('Pagination failed at page ' + page);
        break;
      }

      // SimControl API response structure
      var results = response.data || response.results || [];
      var meta = response.meta || {};

      if (results.length > 0) {
        allResults = allResults.concat(results);
        Logger.log('Fetched page ' + page + ': ' + results.length + ' results');
      }

      // Check if there's a next page
      // Note: SimControl API uses "has_next_page?" with a question mark
      hasNextPage = meta['has_next_page?'] === true || meta.hasNextPage === true || meta.has_next_page === true;

      if (hasNextPage) {
        page++;
      } else {
        Logger.log('No more pages. Stopping pagination.');
      }
    }

    Logger.log('Total results fetched: ' + allResults.length);
    return allResults;
  }

  return {
    call: call,
    callWithPagination: callWithPagination
  };

})();


/**
 * FOTA Web API client
 */
var FotaWebAPI = (function() {

  var BASE_URL = 'https://api.teltonika.lt';

  /**
   * Call FOTA Web API
   * @param {string} endpoint - API endpoint (with leading slash)
   * @param {string} method - HTTP method (GET, POST)
   * @returns {Object|null} Parsed JSON response or null on error
   */
  function call(endpoint, method) {
    method = method || 'GET';

    var apiKey = Config.getApiKey('fotaweb');
    if (!apiKey) {
      Logger.logError('FOTA Web API key not configured');
      return null;
    }

    var options = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + apiKey
      }
    };

    return ApiClient.call(BASE_URL, endpoint, options);
  }

  return {
    call: call
  };

})();
