// Version: 1.0.0
// Configuration Manager - Centralized configuration using Script Properties

/**
 * Config namespace for managing script properties and configuration
 */
var Config = (function() {

  /**
   * Get all configuration as a structured object
   * @returns {Object} Complete configuration object
   */
  function get() {
    var props = PropertiesService.getScriptProperties().getProperties();

    return {
      defaults: {
        startDate: props.DEFAULT_START_DATE || "2025-01-01",
        logSheetName: props.LOG_SHEET_NAME || "[APP] Debug Log"
      },
      apiKeys: {
        simcontrol: props.SIMCONTROL_API_KEY || "",
        fotaweb: props.FOTAWEB_API_KEY || ""
      },
      integrations: {
        airtime: {
          enabled: props.ENABLE_AIRTIME === "true",
          sheetName: props.AIRTIME_SHEET_NAME || "[API] Airtime Usage",
          startDate: props.AIRTIME_START_DATE || props.DEFAULT_START_DATE || "2025-01-01",
          excludedMsisdns: _parseJsonArray(props.AIRTIME_EXCLUDED_MSISDNS) || []
        },
        data: {
          enabled: props.ENABLE_DATA === "true",
          sheetName: props.DATA_SHEET_NAME || "[API] Data Usage",
          startDate: props.DATA_START_DATE || props.DEFAULT_START_DATE || "2025-01-01",
          excludedMsisdns: _parseJsonArray(props.DATA_EXCLUDED_MSISDNS) || []
        },
        recharges: {
          enabled: props.ENABLE_RECHARGES === "true",
          sheetName: props.RECHARGE_SHEET_NAME || "[API] Recharges"
        },
        products: {
          enabled: props.ENABLE_PRODUCTS === "true",
          sheetName: props.PRODUCTS_SHEET_NAME || "[API] Recharge Product IDs",
          networkIds: _parseJsonArray(props.PRODUCTS_NETWORK_IDS) || [10, 11],
          productType: props.PRODUCTS_TYPE || "DATA"
        },
        simDetails: {
          enabled: props.ENABLE_SIM_DETAILS === "true",
          sheetName: props.SIM_DETAILS_SHEET_NAME || "[API] SimControl Data"
        },
        analytics: {
          enabled: props.ENABLE_ANALYTICS === "true",
          usageAgeAnalysis: {
            enabled: props.ANALYTICS_USAGE_AGE_ENABLED === "true",
            sheetName: props.ANALYTICS_USAGE_AGE_SHEET || "[APP] Usage Age Analysis"
          },
          highUsageFilter: {
            enabled: props.ANALYTICS_HIGH_USAGE_ENABLED === "true",
            sheetName: props.ANALYTICS_HIGH_USAGE_SHEET || "[APP] High Usage",
            threshold: parseInt(props.ANALYTICS_HIGH_USAGE_THRESHOLD) || 1500
          }
        },
        fotaweb: {
          enabled: props.ENABLE_FOTAWEB === "true",
          sheetName: props.FOTAWEB_SHEET_NAME || "[API] FOTA Web"
        },
        qrcode: {
          enabled: props.ENABLE_QRCODE === "true",
          sheetName: props.QRCODE_SHEET_NAME || "[APP] QR Codes",
          whatsappNumber: props.WHATSAPP_NUMBER || "27600139923",
          driveFolderName: props.QRCODE_FOLDER_NAME || "QR Codes"
        }
      }
    };
  }

  /**
   * Get configuration for a specific integration type
   * @param {string} type - Integration type (airtime, data, recharges, etc.)
   * @returns {Object|null} Integration configuration or null if not found
   */
  function getIntegration(type) {
    var config = get();
    return config.integrations[type] || null;
  }

  /**
   * Get API key for a specific service
   * @param {string} service - Service name (simcontrol, fotaweb)
   * @returns {string} API key or empty string
   */
  function getApiKey(service) {
    var config = get();
    return config.apiKeys[service] || "";
  }

  /**
   * Parse JSON array from string, return empty array on error
   * @param {string} jsonString - JSON array string
   * @returns {Array} Parsed array or empty array
   * @private
   */
  function _parseJsonArray(jsonString) {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      Logger.logError("Failed to parse JSON array: " + jsonString, e);
      return [];
    }
  }

  // Public API
  return {
    get: get,
    getIntegration: getIntegration,
    getApiKey: getApiKey
  };

})();
