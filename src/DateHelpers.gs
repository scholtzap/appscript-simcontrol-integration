// Version: 1.0.0
// DateHelpers - Date/time utilities

/**
 * DateHelpers namespace for date operations
 */
var DateHelpers = (function() {

  /**
   * Get yesterday's date in YYYY-MM-DD format
   * @returns {string} Yesterday's date
   */
  function getYesterday() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    return formatDate(date);
  }

  /**
   * Format date to YYYY-MM-DD format for API calls
   * @param {Date|string} date - Date object or string
   * @returns {string} Formatted date string (YYYY-MM-DD)
   */
  function formatDate(date) {
    var d;

    if (typeof date === "string") {
      d = new Date(date);
    } else if (date instanceof Date) {
      d = date;
    } else {
      Logger.logError("Invalid date format: " + date);
      return "";
    }

    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  /**
   * Parse date from string (YYYY-MM-DD or ISO format)
   * @param {string} dateString - Date string
   * @returns {Date|null} Date object or null if invalid
   */
  function parseDate(dateString) {
    if (!dateString) {
      return null;
    }

    try {
      var date = new Date(dateString);
      if (isNaN(date.getTime())) {
        Logger.logError("Invalid date string: " + dateString);
        return null;
      }
      return date;
    } catch (e) {
      Logger.logError("Failed to parse date: " + dateString, e);
      return null;
    }
  }

  /**
   * Generate array of dates between start and end (inclusive)
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {Array<string>} Array of date strings (YYYY-MM-DD)
   */
  function getDateRange(startDate, endDate) {
    var start = typeof startDate === "string" ? parseDate(startDate) : startDate;
    var end = typeof endDate === "string" ? parseDate(endDate) : endDate;

    if (!start || !end) {
      Logger.logError("Invalid date range: " + startDate + " to " + endDate);
      return [];
    }

    var dates = [];
    var current = new Date(start);

    while (current <= end) {
      dates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   * @returns {string} Today's date
   */
  function getToday() {
    return formatDate(new Date());
  }

  /**
   * Add days to a date
   * @param {string|Date} date - Starting date
   * @param {number} days - Number of days to add (can be negative)
   * @returns {string} New date in YYYY-MM-DD format
   */
  function addDays(date, days) {
    var d = typeof date === "string" ? parseDate(date) : new Date(date);
    if (!d) {
      return "";
    }

    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  /**
   * Get difference in days between two dates
   * @param {string|Date} date1 - First date
   * @param {string|Date} date2 - Second date
   * @returns {number} Number of days difference (positive if date1 > date2)
   */
  function daysDifference(date1, date2) {
    var d1 = typeof date1 === "string" ? parseDate(date1) : date1;
    var d2 = typeof date2 === "string" ? parseDate(date2) : date2;

    if (!d1 || !d2) {
      return 0;
    }

    var diff = d1.getTime() - d2.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Public API
  return {
    getYesterday: getYesterday,
    getToday: getToday,
    formatDate: formatDate,
    parseDate: parseDate,
    getDateRange: getDateRange,
    addDays: addDays,
    daysDifference: daysDifference
  };

})();
