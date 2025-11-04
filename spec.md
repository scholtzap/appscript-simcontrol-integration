# Google Apps Script Multi-Integration Specification

## 1. Overview

### 1.1 Project Goals

Transform the current collection of standalone Google Apps Script files into a unified, modular, configuration-driven codebase that supports multiple integrations within a single Google Sheet deployment. The App Scripts should lend themselves well to being used with multiple Google accounts when deployed to those accounts with CLASP, and also have the ability to access APIs with different tokens depending on the deployment.

### 1.2 Current State

- **Multiple standalone files**: Separate files for airtime, data, FOTA Web, and QR code generation
- **Code duplication**: ~95% similarity between airtime and data implementations
- **Manual deployment**: Inconsistent CLASP configuration across deployments
- **Limited flexibility**: Cannot run multiple integrations in the same spreadsheet
- **Slight Variations in Code**: Variable names and functions that perform largely the same function are duplicated across the different app script files with minor changes.

### 1.3 Target State

- **Single codebase**: One set of modular source files, each thematic app-script should have its own .gs file and general utility functions collected in such a separate file, other "binned" functions split into multiple .gs files are also permitted to give a logical structure to the code base and allow easy debugging or additions.
- **Configuration-driven**: Script properties control behavior per deployment
- **Multi-integration support**: Each spreadsheet can run airtime, data, FOTA, and QR integrations
- **Standardized deployment**: Consistent CLASP workflow via GitHub Actions
- **Easy maintenance**: Update code once, deploy to all accounts

---

## 2. Architecture Design

### 2.1 Core Principles

1. **Separation of Concerns**: Each integration type has its own module
2. **Configuration over Code**: Behavior controlled by script properties, not code changes
3. **Reusability**: Shared utilities (API clients, helpers, logging) used across all integrations
4. **Flexibility**: Enable/disable integrations per deployment
5. **Maintainability**: Clear module boundaries, minimal duplication

### 2.2 Integration Types

Each Google Sheet deployment can run **any combination** of the following integrations, enabled via configuration:

| Integration | Purpose | Target Sheet | Category |
|-------------|---------|--------------|----------|
| **SimControl Airtime** | Track airtime usage (ZAR currency) | `[API] Airtime Usage` | Core Usage Tracking |
| **SimControl Data** | Track data usage (MB consumed) | `[API] Data Usage` | Core Usage Tracking |
| **SimControl Recharges** | Track recharge history | `[API] Recharges` | Optional |
| **SimControl Products** | List all available recharge products | `[API] Recharge Product IDs` | Optional |
| **SimControl SIM Details** | Export all SIM details and metadata | `[API] SimControl Data` | Optional |
| **SimControl Descriptions** | Update SIM descriptions in bulk | N/A (updates API) | Utility |
| **SIM Usage Analysis** | Analyze SIM usage age and activity | `[APP] Usage Age Analysis` | Analytics |
| **High Usage Filter** | Extract SIMs with data usage ≥1500MB | `[APP] High Usage` | Analytics |
| **FOTA Web** | Teltonika device management | `[API] FOTA Web` | Optional |
| **QR Code Generator** | Generate WhatsApp QR codes | `[APP] QR Codes` | Optional |

**Deployment Flexibility**: Each deployment (Google Sheet) can enable/disable any combination of these integrations via script properties. This allows:
- **Account 1** might enable only Airtime tracking
- **Account 2** might enable Data + Recharges + Analytics
- **WiFi Gateway** deployment might enable Data + SIM Details + Usage Analysis + Products
- **Future accounts** can have any custom combination

### 2.3 Sheet Naming Conventions

**IMPORTANT**: All sheet names must follow a consistent naming convention to distinguish between data sources:

**[API] Prefix** - Sheets populated directly from external API data:
- `[API] Airtime Usage` → SimControl API airtime data (ZAR currency)
- `[API] Data Usage` → SimControl API data usage (MB)
- `[API] Recharges` → SimControl API recharge records
- `[API] Recharge Product IDs` → SimControl API available products
- `[API] SimControl Data` → SimControl API full SIM details export
- `[API] FOTA Web` → Teltonika FOTA Web API device data

**[APP] Prefix** - Sheets populated by app script processing (not direct from API):
- `[APP] Debug Log` → Application logging output
- `[APP] High Usage` → Processed/filtered data (≥1500MB)
- `[APP] Usage Age Analysis` → SIM usage age and last activity analysis
- `[APP] QR Codes` → Generated WhatsApp QR code images

**No Prefix** - User-managed sheets (not created by script):
- Manual data entry sheets
- Custom reports
- Reference data

**Rationale**: This naming convention provides:
1. **Clear data provenance**: Users know if data came from API or was processed
2. **Easier troubleshooting**: API issues vs. app logic issues
3. **Better organization**: Related sheets are grouped alphabetically
4. **Consistent user experience**: Predictable sheet names across deployments

### 2.4 Multi-Integration Model

**Example: Fully-Enabled Deployment**
```
Single Google Sheet Deployment
├── Menu: "SimControl Integration"
│   ├── 📞 Airtime Usage
│   │   ├── Download All Historical Data → [API] Airtime Usage sheet
│   │   └── Fetch Previous Day Only → [API] Airtime Usage sheet
│   ├── 📊 Data Usage
│   │   ├── Download All Historical Data → [API] Data Usage sheet
│   │   ├── Fetch Previous Day Only → [API] Data Usage sheet
│   │   ├── Fetch Recharges → [API] Recharges sheet
│   │   ├── Create Product Catalog → [API] Recharge Product IDs sheet
│   │   └── Extract High Usage → [APP] High Usage sheet
│   ├── 📱 SIM Management
│   │   ├── Update SIM Descriptions (updates API)
│   │   ├── Export All SIM Details → [API] SimControl Data sheet
│   │   └── Analyze Usage Age → [APP] Usage Age Analysis sheet
│   ├── 🌐 FOTA Web
│   │   └── Fetch Device Data → [API] FOTA Web sheet
│   └── 📲 QR Codes
│       └── Generate WhatsApp QR Codes → [APP] QR Codes sheet
```

**Note**: Menu items only appear if their corresponding integration is enabled in script properties.

---

## 3. File Structure

### 3.1 Repository Layout

```
appscript-simcontrol-integration/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # Unified deployment workflow
├── deployments/
│   ├── account1-airtime/             # Example: Airtime-only deployment
│   │   ├── .clasp.json               # Script ID
│   │   └── config.json               # Configuration
│   ├── account2-data/                # Example: Data tracking deployment
│   │   ├── .clasp.json
│   │   └── config.json
│   ├── wifi-gateway/                 # Example: SIM management deployment
│   │   ├── .clasp.json
│   │   └── config.json
│   └── [future-deployments]/         # Add more as needed
├── src/
│   ├── appsscript.json               # Apps Script manifest
│   ├── Config.gs                     # Configuration manager
│   ├── ApiClient.gs                  # Unified API client (SimControl + FOTA)
│   ├── SimControlUsage.gs            # Generic usage fetcher (airtime/data)
│   ├── SimControlRecharges.gs        # Recharge tracking
│   ├── SimControlProducts.gs         # Product catalog management
│   ├── SimControlSIMDetails.gs       # Full SIM details export
│   ├── SimControlDescriptions.gs     # SIM description updates
│   ├── SimControlSims.gs             # SIM retrieval functions
│   ├── SimControlAnalytics.gs        # Usage age analysis, high usage filter
│   ├── FotaWeb.gs                    # FOTA Web integration
│   ├── QRCodeGenerator.gs            # QR code generation
│   ├── SheetHelpers.gs               # Sheet manipulation utilities
│   ├── DateHelpers.gs                # Date/time utilities
│   ├── RateLimiter.gs                # Rate limit management
│   ├── TriggerManager.gs             # Trigger scheduling
│   ├── Logger.gs                     # Logging utilities
│   ├── Menu.gs                       # Dynamic menu builder
│   └── Tests.gs                      # Test functions
├── originals/                         # Legacy files (archived, not deployed)
│   ├── fotaweb-integration.gs
│   ├── generate-whatsapp-QR-codes.gs
│   ├── main-airtime.gs
│   ├── main-data.gs
│   ├── main-update-descriptions.gs
│   └── wifi-gateway-sheet.gs
├── scripts/
│   ├── deploy.sh                      # Deployment helper script
│   └── setup-properties.sh            # Script properties setup helper
├── simcontrol-api-docs.json           # SimControl API documentation (OpenAPI)
├── fotaweb-api-docs.json              # FOTA Web API documentation (OpenAPI)
├── .clasp.json.template               # Template for local development
├── .claspignore                       # Exclude originals/, .git, etc.
├── .gitignore
├── readme.md
└── spec.md                            # This file
```

### 3.2 Deployment Structure

Each deployment folder represents **one Google Sheet** with its own script ID and configuration.

**Example Deployment Configurations**:

**`deployments/account1-airtime/`** - Airtime tracking only
- `.clasp.json` → Script ID for Airtime sheet
- `config.json` → Enables only airtime integration

**`deployments/account2-data/`** - Full data management
- `.clasp.json` → Script ID for Data sheet
- `config.json` → Enables data, recharges, products, high usage analysis

**`deployments/wifi-gateway/`** - SIM management focus
- `.clasp.json` → Script ID for WiFi Gateway sheet
- `config.json` → Enables data, SIM details, usage analysis, products

**Scalability**: Add new deployments by creating new folders with appropriate configs. Same codebase deploys everywhere.

### 3.3 API Documentation Reference

The repository includes complete API documentation for external services:

**`simcontrol-api-docs.json`** - SimControl API (OpenAPI 3.0 format)
- Base URL: `https://app.simcontrol.co.za/api`
- Authentication: `x-api-key` header
- Key endpoints used:
  - `/sims` - SIM retrieval and management
  - `/usage-details` - Historical usage data (airtime/data/SMS)
  - `/recharge` - Recharge history and operations
  - `/products` - Available recharge products
  - `/organisations/balance` - Account balance check
- Rate limiting: Via `x-ratelimit-*` response headers
- Pagination: Uses `page`, `page_size`, `has_next_page?` pattern

**`fotaweb-api-docs.json`** - Teltonika FOTA Web API (OpenAPI 3.0 format)
- Base URL: `https://api.teltonika.lt`
- Authentication: Bearer token
- Device management and firmware updates

**Developer Usage**: Reference these OpenAPI specs when:
- Adding new API endpoints
- Understanding response schemas
- Debugging API issues
- Implementing new integrations

---

## 4. Module Specifications

### 4.1 Config.gs

**Purpose**: Centralized configuration management using Script Properties

**Key Functions**:
- `Config.get()` → Returns full configuration object
- `Config.getIntegration(type)` → Returns specific integration config
- `Config.getApiKey(service)` → Returns API key for service

**Configuration Schema**:
```javascript
{
  defaults: {
    startDate: "2025-01-01",
    logSheetName: "[APP] Debug Log"
  },
  apiKeys: {
    simcontrol: "xxx",
    fotaweb: "xxx"
  },
  integrations: {
    airtime: {
      enabled: true,
      sheetName: "[API] Airtime Usage",
      startDate: "2025-01-01",
      excludedMsisdns: ["27123456789"]
    },
    data: {
      enabled: true,
      sheetName: "[API] Data Usage",
      startDate: "2025-08-26",
      excludedMsisdns: []
    },
    recharges: {
      enabled: false,
      sheetName: "[API] Recharges"
    },
    products: {
      enabled: false,
      sheetName: "[API] Recharge Product IDs",
      networkIds: [10, 11],  // Network IDs to fetch products for
      productType: "DATA"     // Product type filter
    },
    simDetails: {
      enabled: false,
      sheetName: "[API] SimControl Data"
    },
    analytics: {
      enabled: false,
      usageAgeAnalysis: {
        enabled: false,
        sheetName: "[APP] Usage Age Analysis"
      },
      highUsageFilter: {
        enabled: false,
        sheetName: "[APP] High Usage",
        threshold: 1500  // MB threshold
      }
    },
    fotaweb: {
      enabled: false,
      sheetName: "[API] FOTA Web"
    },
    qrcode: {
      enabled: false,
      sheetName: "[APP] QR Codes",
      whatsappNumber: "27600139923",
      driveFolderName: "QR Codes"
    }
  }
}
```

### 4.2 ApiClient.gs

**Purpose**: Unified API client with rate limiting and error handling

**Key Components**:
- `ApiClient.call()` → Generic HTTP client
- `SimControlAPI.call()` → SimControl API wrapper
- `FotaWebAPI.call()` → FOTA Web API wrapper

**Features**:
- Automatic rate limit detection (429 status)
- Retry logic with exponential backoff
- Centralized error handling
- Request/response logging

### 4.3 SimControlUsage.gs

**Purpose**: Generic usage fetcher for both airtime and data

**Key Functions**:
```javascript
// Core function (generic)
fetchAllHistoricalUsage(usageType)  // usageType: 'airtime' or 'data'

// Wrapper functions for menu
fetchAirtimeUsage()                  // Calls fetchAllHistoricalUsage('airtime')
fetchDataUsage()                     // Calls fetchAllHistoricalUsage('data')

// Daily fetch wrappers
fetchPreviousDayUsage(usageType)
fetchPreviousDayAirtime()
fetchPreviousDayData()

// Clear functions
clearAirtimeSheet()
clearDataSheet()
```

**Logic**:
1. Get configuration for specified usage type (airtime/data)
2. Check if integration is enabled
3. Retrieve active SIMs from SimControl API
4. For each SIM, fetch usage records
5. Write to configured sheet name
6. Handle exclusions, rate limits, and errors

### 4.4 SimControlRecharges.gs

**Purpose**: Recharge tracking functionality

**Key Functions**:
- `fetchRecharges()` → Fetch recharge history
- `fetchRechargesBetweenDates(startDate, endDate)` → Date-filtered recharges
- `fetchRecentRechargesToSheet()` → Fetch recent recharges (today & yesterday)

**Target Sheet**: Configured via `RECHARGE_SHEET_NAME` (default: `[API] Recharges`)

**Features**:
- Pagination support for large recharge datasets
- Date range filtering
- Transaction ID tracking
- Status monitoring (completed, pending, failed)

### 4.5 SimControlProducts.gs

**Purpose**: Product catalog management

**Key Functions**:
- `createRechargeProductSheet()` → Fetch and list all available recharge products
- `getProductsByNetwork(networkId)` → Filter products by network
- `getProductsByType(productType)` → Filter products by type (DATA, AIRTIME, SMS)

**Target Sheet**: Configured via `PRODUCTS_SHEET_NAME` (default: `[API] Recharge Product IDs`)

**Features**:
- Network filtering (e.g., MTN, Vodacom network IDs)
- Product type filtering (DATA, AIRTIME, SMS)
- Dynamic header generation from API response
- Clears and refreshes product list on demand

### 4.6 SimControlSIMDetails.gs

**Purpose**: Full SIM details export

**Key Functions**:
- `fetchAllSIMDetailsToSheet()` → Export complete SIM details with all metadata
- `refreshSIMDetails()` → Update existing SIM details sheet

**Target Sheet**: Configured via `SIM_DETAILS_SHEET_NAME` (default: `[API] SimControl Data`)

**Features**:
- Exports all SIM fields (ICCID, IMSI, MSISDN, network status, balances, tags, etc.)
- Handles nested objects (serializes to JSON)
- Dynamic column headers based on API response
- Useful for comprehensive SIM inventory

### 4.7 SimControlAnalytics.gs

**Purpose**: Usage analysis and filtering

**Key Functions**:
- `generateSIMUsageSummary()` / `analyzeUsageAge()` → Analyze last usage date and activity age
- `extractHighUsage()` → Filter SIMs exceeding data threshold
- `identifyInactiveSIMs(days)` → Find SIMs with no usage for X days

**Target Sheets**:
- Usage age analysis: `[APP] Usage Age Analysis`
- High usage: `[APP] High Usage`

**Features**:
- Calculates days since last usage
- Identifies SIM status (ACTIVE, SUSPENDED)
- Configurable thresholds
- Helps identify candidates for suspension or reactivation

### 4.8 SimControlDescriptions.gs

**Purpose**: Bulk update SIM descriptions from sheet

**Key Functions**:
- `updateSimDescriptionsFromSheet()` → Read from sheet, update via API
- `sanitizeDescription()` → Remove special characters
- `autoFormatPhoneNumbers()` → Add "WGID: " prefix to phone numbers

**Features**:
- Batch processing with continuation support
- Validation before update
- Error handling per SIM
- Progress logging

### 4.6 SimControlSims.gs

**Purpose**: SIM retrieval functions

**Key Functions**:
- `getAllSIMs()` → Fetch all SIMs (with pagination)
- `getActiveSIMs()` → Fetch only active SIMs
- `getSuspendedSIMs()` → Fetch only suspended SIMs
- `getSIMById(simId)` → Fetch single SIM details

**Features**:
- Automatic pagination handling
- Caching for performance
- Filter support (status, managed, etc.)

### 4.7 FotaWeb.gs

**Purpose**: Teltonika FOTA Web integration

**Key Functions**:
- `fetchFotaWebData()` → Fetch device data from FOTA Web API
- `copyFOTAtoDeviceSIMAss()` → Copy FOTA data to device-SIM association sheet
- `clearFotaSheet()` → Clear FOTA data sheet

**API Endpoint**: `https://api.teltonika.lt`

**Target Sheet**: Configured via `FOTAWEB_SHEET_NAME` (default: `[API] FOTA Web`)

### 4.8 QRCodeGenerator.gs

**Purpose**: Generate WhatsApp QR codes

**Key Functions**:
- `generateWhatsAppQRCodes()` → Generate QR codes for WhatsApp messages
- `uploadQRCodeToDrive()` → Store QR images in Google Drive
- `clearQRSheet()` → Clear QR code sheet

**External API**: `api.qrserver.com`

**Target Sheet**: Configured via `QRCODE_SHEET_NAME` (default: `[APP] QR Codes`)

### 4.9 SheetHelpers.gs

**Purpose**: Sheet manipulation utilities

**Key Functions**:
- `getOrCreateSheet(sheetName)` → Get existing or create new sheet
- `ensureUsageHeader(sheet, usageType)` → Set proper column headers
- `clearSheetData(sheetName)` → Clear data while preserving headers
- `appendRowsInBatch(sheet, rows)` → Efficient batch writing

### 4.10 DateHelpers.gs

**Purpose**: Date/time utilities

**Key Functions**:
- `getYesterday()` → Get yesterday's date (YYYY-MM-DD)
- `formatDate(date)` → Format date for API calls
- `parseDate(dateString)` → Parse date from string
- `getDateRange(startDate, endDate)` → Generate date range array

### 4.11 RateLimiter.gs

**Purpose**: API rate limit management

**Key Functions**:
- `RateLimiter.checkAndWait()` → Check if rate limited, wait if needed
- `RateLimiter.handleRateLimit(response)` → Handle 429 response
- `RateLimiter.clearFlag()` → Clear rate limit flag
- `RateLimiter.checkAppsScriptQuotaReset()` → Check Apps Script quota

**Features**:
- Persistent rate limit state (script properties)
- Automatic backoff and retry
- Apps Script quota awareness

### 4.12 TriggerManager.gs

**Purpose**: Trigger scheduling and management

**Key Functions**:
- `setupDailyTriggers()` → Create daily triggers for airtime/data
- `deleteAllTriggers()` → Remove all project triggers
- `listActiveTriggers()` → Show current triggers
- `scheduleNextHistoricalRun()` → Schedule continuation for long jobs

### 4.13 Logger.gs

**Purpose**: Centralized logging

**Key Functions**:
- `Logger.log(message, data)` → Info logging
- `Logger.logError(message, error)` → Error logging
- `Logger.logToSheet(level, message, data)` → Write to debug log sheet
- `Logger.clearDebugLog()` → Clear debug log
- `Logger.showDebugLog()` → Navigate to debug log sheet

**Target Sheet**: Configured via `LOG_SHEET_NAME`

### 4.14 Menu.gs

**Purpose**: Dynamic menu builder

**Key Functions**:
- `onOpen()` → Build menu based on enabled integrations
- `buildAirtimeMenu()` → Airtime submenu
- `buildDataMenu()` → Data submenu
- `buildSIMMenu()` → SIM management submenu
- `buildFotaMenu()` → FOTA Web submenu
- `buildQRMenu()` → QR code submenu
- `buildUtilsMenu()` → Utilities submenu

**Behavior**: Only shows submenus for enabled integrations

### 4.15 Tests.gs

**Purpose**: Test and validation functions

**Key Functions**:
- `testSimcontrolApiKey()` → Validate API connectivity
- `testUpdateSimDescription()` → Test description update
- `testSingleSimDayUsage()` → Test single SIM fetch
- `testFetchRechargesToLog()` → Test recharge fetch
- `grantTriggerPermissions()` → Helper for trigger permissions

---

## 5. Configuration Strategy

### 5.1 Script Properties (Per Deployment)

Configuration stored in Google Apps Script Script Properties, managed via `config.json` per deployment.

**Global Settings**:
```
DEFAULT_START_DATE = "2025-01-01"
LOG_SHEET_NAME = "[APP] Debug Log"
SIMCONTROL_API_KEY = "your-api-key"
FOTAWEB_API_KEY = "your-fotaweb-key"
```

**Airtime Integration**:
```
ENABLE_AIRTIME = "true"
AIRTIME_SHEET_NAME = "[API] Airtime Usage"
AIRTIME_START_DATE = "2025-01-01"
AIRTIME_EXCLUDED_MSISDNS = "[\"27123456789\"]"
```

**Data Integration**:
```
ENABLE_DATA = "true"
DATA_SHEET_NAME = "[API] Data Usage"
DATA_START_DATE = "2025-08-26"
DATA_EXCLUDED_MSISDNS = "[]"
```

**Recharge Tracking**:
```
ENABLE_RECHARGES = "true"
RECHARGE_SHEET_NAME = "[API] Recharges"
```

**Product Catalog**:
```
ENABLE_PRODUCTS = "true"
PRODUCTS_SHEET_NAME = "[API] Recharge Product IDs"
PRODUCTS_NETWORK_IDS = "[10, 11]"  # Network IDs (e.g., MTN, Vodacom)
PRODUCTS_TYPE = "DATA"             # Product type: DATA, AIRTIME, SMS
```

**SIM Details Export**:
```
ENABLE_SIM_DETAILS = "true"
SIM_DETAILS_SHEET_NAME = "[API] SimControl Data"
```

**Analytics**:
```
ENABLE_ANALYTICS = "true"
ANALYTICS_USAGE_AGE_ENABLED = "true"
ANALYTICS_USAGE_AGE_SHEET = "[APP] Usage Age Analysis"
ANALYTICS_HIGH_USAGE_ENABLED = "true"
ANALYTICS_HIGH_USAGE_SHEET = "[APP] High Usage"
ANALYTICS_HIGH_USAGE_THRESHOLD = "1500"  # MB threshold
```

**FOTA Web Integration**:
```
ENABLE_FOTAWEB = "true"
FOTAWEB_SHEET_NAME = "[API] FOTA Web"
```

**QR Code Integration**:
```
ENABLE_QRCODE = "true"
QRCODE_SHEET_NAME = "[APP] QR Codes"
WHATSAPP_NUMBER = "27600139923"
QRCODE_FOLDER_NAME = "QR Codes"
```

**Runtime State** (managed by code):
```
RATE_LIMIT_HIT = "false"
RATE_LIMIT_RESET_TIME = ""
LAST_PROCESSED_DATE = "2025-01-01"
CURRENT_ROW_INDEX = "1"
CANCEL_SIM_JOB = "false"
```

### 5.2 Deployment Config Files

Each deployment has a `config.json` that defines script properties. Below are examples showing different deployment configurations:

**deployments/account1-airtime/config.json** - Airtime tracking only:
```json
{
  "scriptProperties": {
    "SIMCONTROL_API_KEY": "account1-api-key",
    "DEFAULT_START_DATE": "2025-01-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "true",
    "AIRTIME_SHEET_NAME": "[API] Airtime Usage",
    "AIRTIME_START_DATE": "2025-01-01",
    "AIRTIME_EXCLUDED_MSISDNS": "[\"27123456789\"]",

    "ENABLE_DATA": "false",
    "ENABLE_RECHARGES": "false",
    "ENABLE_PRODUCTS": "false",
    "ENABLE_SIM_DETAILS": "false",
    "ENABLE_ANALYTICS": "false",
    "ENABLE_FOTAWEB": "false",
    "ENABLE_QRCODE": "false"
  }
}
```

**deployments/account2-data/config.json** - Full data management:
```json
{
  "scriptProperties": {
    "SIMCONTROL_API_KEY": "account2-api-key",
    "DEFAULT_START_DATE": "2025-01-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "false",

    "ENABLE_DATA": "true",
    "DATA_SHEET_NAME": "[API] Data Usage",
    "DATA_START_DATE": "2025-08-26",
    "DATA_EXCLUDED_MSISDNS": "[]",

    "ENABLE_RECHARGES": "true",
    "RECHARGE_SHEET_NAME": "[API] Recharges",

    "ENABLE_PRODUCTS": "true",
    "PRODUCTS_SHEET_NAME": "[API] Recharge Product IDs",
    "PRODUCTS_NETWORK_IDS": "[10, 11]",
    "PRODUCTS_TYPE": "DATA",

    "ENABLE_SIM_DETAILS": "false",

    "ENABLE_ANALYTICS": "true",
    "ANALYTICS_USAGE_AGE_ENABLED": "false",
    "ANALYTICS_HIGH_USAGE_ENABLED": "true",
    "ANALYTICS_HIGH_USAGE_SHEET": "[APP] High Usage",
    "ANALYTICS_HIGH_USAGE_THRESHOLD": "1500",

    "ENABLE_FOTAWEB": "false",
    "ENABLE_QRCODE": "false"
  }
}
```

**deployments/wifi-gateway/config.json** - SIM management focus:
```json
{
  "scriptProperties": {
    "SIMCONTROL_API_KEY": "account2-api-key-same-as-data",
    "DEFAULT_START_DATE": "2025-06-01",
    "LOG_SHEET_NAME": "[APP] Debug Log",

    "ENABLE_AIRTIME": "false",

    "ENABLE_DATA": "true",
    "DATA_SHEET_NAME": "[API] Data Usage",
    "DATA_START_DATE": "2025-06-01",
    "DATA_EXCLUDED_MSISDNS": "[]",

    "ENABLE_RECHARGES": "false",

    "ENABLE_PRODUCTS": "true",
    "PRODUCTS_SHEET_NAME": "[API] Recharge Product IDs",
    "PRODUCTS_NETWORK_IDS": "[10, 11]",
    "PRODUCTS_TYPE": "DATA",

    "ENABLE_SIM_DETAILS": "true",
    "SIM_DETAILS_SHEET_NAME": "[API] SimControl Data",

    "ENABLE_ANALYTICS": "true",
    "ANALYTICS_USAGE_AGE_ENABLED": "true",
    "ANALYTICS_USAGE_AGE_SHEET": "[APP] Usage Age Analysis",
    "ANALYTICS_HIGH_USAGE_ENABLED": "false",

    "ENABLE_FOTAWEB": "false",
    "ENABLE_QRCODE": "false"
  }
}
```

**Key Points**:
- All deployments can share the same `SIMCONTROL_API_KEY` (if under same account)
- Different `START_DATE` values allow each deployment to track different time periods
- Enable only the integrations needed for each specific use case
- Sheet names can be customized per deployment if needed

### 5.3 Configuration Setup Script

A helper script (`scripts/setup-properties.sh`) will read `config.json` and set script properties via CLASP:

```bash
#!/bin/bash
# Usage: ./scripts/setup-properties.sh deployments/account1

DEPLOYMENT_DIR=$1
CONFIG_FILE="$DEPLOYMENT_DIR/config.json"

cd $DEPLOYMENT_DIR
jq -r '.scriptProperties | to_entries[] | "\(.key)=\(.value)"' $CONFIG_FILE | while read line; do
  KEY=$(echo $line | cut -d'=' -f1)
  VALUE=$(echo $line | cut -d'=' -f2-)
  clasp run setScriptProperty --params "[\"$KEY\", \"$VALUE\"]"
done
```

---

## 6. Deployment Approach

### 6.1 CLASP Configuration

Each deployment has its own `.clasp.json` pointing to a specific Google Apps Script project:

**deployments/account1/.clasp.json**:
```json
{
  "scriptId": "ACCOUNT_1_SCRIPT_ID",
  "rootDir": "../../src"
}
```

**deployments/account2/.clasp.json**:
```json
{
  "scriptId": "ACCOUNT_2_SCRIPT_ID",
  "rootDir": "../../src"
}
```

All deployments share the same `src/` directory.

### 6.2 GitHub Actions Workflow

Unified workflow: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Google Apps Script

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'deployments/**'
  workflow_dispatch:
    inputs:
      deployment:
        description: 'Which deployment to update'
        required: true
        type: choice
        options:
          - account1
          - account2
          - all

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        deployment: ${{ github.event_name == 'workflow_dispatch' && (github.event.inputs.deployment == 'all' && ['account1', 'account2'] || [github.event.inputs.deployment]) || ['account1', 'account2'] }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install CLASP
        run: npm install -g @google/clasp

      - name: Setup CLASP credentials
        env:
          CLASPRC: ${{ secrets[format('CLASPRC_{0}', matrix.deployment)] }}
        run: echo "$CLASPRC" | base64 -d > ~/.clasprc

      - name: Deploy to ${{ matrix.deployment }}
        working-directory: deployments/${{ matrix.deployment }}
        run: clasp push --force

      - name: Verify deployment
        working-directory: deployments/${{ matrix.deployment }}
        run: clasp version | head -n 5
```

### 6.3 GitHub Secrets

Required secrets per deployment:

- `CLASPRC_account1` → Base64-encoded CLASP credentials for Account 1
- `CLASPRC_account2` → Base64-encoded CLASP credentials for Account 2

**Generate CLASPRC**:
```bash
cat ~/.clasprc | base64 -w 0
```

### 6.4 Deployment Workflow

**Manual Deployment**:
```bash
# Deploy to account1
cd deployments/account1
clasp push

# Deploy to account2
cd deployments/account2
clasp push
```

**Automated Deployment** (on push to main):
- Workflow detects changes in `src/` or `deployments/`
- Deploys to all affected deployments
- Runs verification checks

### 6.5 Initial Setup for New Deployment

1. Create new Google Sheet
2. Open Apps Script editor (Extensions → Apps Script)
3. Note the Script ID (from URL)
4. Create `deployments/accountX/` folder
5. Create `.clasp.json` with script ID
6. Create `config.json` with settings
7. Run `clasp push` from deployment folder
8. Run `setup-properties.sh` to configure script properties
9. Reload Google Sheet → Menu appears
10. Test integrations

---

## 7. Migration Plan

### 7.1 Phase 1: Create Modular Codebase

**Tasks**:
- ✅ Write spec.md (this file)
- Create `src/` directory structure
- Implement core modules:
  - Config.gs
  - ApiClient.gs
  - SimControlUsage.gs
  - Logger.gs
  - SheetHelpers.gs
  - Menu.gs
- Test in isolation

### 7.2 Phase 2: Extract Shared Utilities

**Tasks**:
- Implement DateHelpers.gs
- Implement RateLimiter.gs
- Implement TriggerManager.gs
- Implement SimControlSims.gs
- Update existing modules to use shared utilities

### 7.3 Phase 3: Implement Additional Integrations

**Tasks**:
- Implement SimControlRecharges.gs
- Implement SimControlDescriptions.gs
- Implement FotaWeb.gs
- Implement QRCodeGenerator.gs
- Update Menu.gs to support all integrations

### 7.4 Phase 4: Set Up Deployment Infrastructure

**Tasks**:
- Create `deployments/account1/` folder
- Create `deployments/account2/` folder
- Create `.clasp.json` templates
- Create `config.json` templates
- Create `scripts/setup-properties.sh`
- Create `scripts/deploy.sh`

### 7.5 Phase 5: Test Deployments

**Tasks**:
- Deploy to Account 1 test sheet
- Configure script properties
- Test airtime integration
- Test data integration
- Verify menu functionality
- Test error handling

### 7.6 Phase 6: Update GitHub Actions

**Tasks**:
- Create unified `.github/workflows/deploy.yml`
- Remove old `deploy-account1.yml` and `deploy-account2.yml`
- Set up GitHub secrets
- Test automated deployment
- Verify deployment verification step

### 7.7 Phase 7: Production Rollout

**Tasks**:
- Deploy to Account 1 production sheet
- Deploy to Account 2 production sheet
- Monitor for errors
- Archive `originals/` folder
- Update readme.md with new instructions
- Create user documentation

---

## 8. Example Usage Scenarios

### 8.1 Scenario: Account 1 (Airtime + Data)

**Deployment**: `deployments/account1/`

**Configuration**:
- Airtime: Enabled, excludes certain MSISDNs
- Data: Enabled, includes recharge tracking
- FOTA Web: Disabled
- QR Code: Disabled

**Result**: Menu shows:
- 📞 Airtime Usage
- 📊 Data Usage
- 📱 SIM Management
- 🔧 Utilities

### 8.2 Scenario: Account 2 (Full Suite)

**Deployment**: `deployments/account2/`

**Configuration**:
- Airtime: Enabled
- Data: Enabled
- FOTA Web: Enabled
- QR Code: Enabled

**Result**: Menu shows all integrations:
- 📞 Airtime Usage
- 📊 Data Usage
- 📱 SIM Management
- 🌐 FOTA Web
- 📲 QR Codes
- 🔧 Utilities

### 8.3 Scenario: Daily Automated Updates

**Setup**:
1. Run `setupDailyTriggers()` from Utilities menu
2. System creates time-based triggers:
   - 6 AM: Fetch previous day airtime
   - 7 AM: Fetch previous day data

**Result**: Data automatically populates daily without manual intervention

### 8.4 Scenario: Adding New Deployment

**Steps**:
1. Create `deployments/account3/` folder
2. Copy `.clasp.json.template` → `.clasp.json`
3. Update script ID
4. Copy `config.json` from account1
5. Customize settings
6. Run `clasp push` from account3 folder
7. Run `setup-properties.sh deployments/account3`
8. Done!

---

## 9. Success Criteria

### 9.1 Functional Requirements

- ✅ Single codebase supports multiple integrations
- ✅ Each deployment can enable/disable integrations independently
- ✅ Airtime and data integrations run in same spreadsheet
- ✅ Configuration via script properties (no code changes)
- ✅ Dynamic menu reflects enabled integrations
- ✅ Automated daily updates via triggers
- ✅ Error handling and logging

### 9.2 Technical Requirements

- ✅ Zero code duplication across files
- ✅ Modular architecture with clear separation of concerns
- ✅ Consistent CLASP deployment workflow
- ✅ GitHub Actions automation
- ✅ Configuration version control
- ✅ Easy to add new deployments

### 9.3 Maintainability Requirements

- ✅ Code changes update all deployments simultaneously
- ✅ Clear documentation in spec.md and readme.md
- ✅ Test functions for each integration
- ✅ Logging for debugging
- ✅ Migration path from originals/ to src/

---

## 10. Open Questions

1. **Script Property Management**: Should we create a web UI for managing script properties, or is manual/script-based setup sufficient?
2. **Version Control**: Should we implement version tagging for deployments (e.g., deploy specific git tags)?
3. **Multi-Sheet Support**: Should a single deployment support multiple sheets (e.g., one for airtime, one for data), or always one sheet per deployment?
4. **Trigger Limits**: Apps Script has trigger limits - how should we handle multiple deployments with daily triggers?
5. **API Key Rotation**: How should we handle API key rotation across deployments?

---

## 11. Future Enhancements

### 11.1 Potential Features

- **Web Dashboard**: Build a web UI for monitoring all deployments
- **Alert System**: Email notifications for errors or high usage
- **Data Visualization**: Charts and graphs for usage trends
- **Bulk Operations**: Mass SIM updates, bulk recharges
- **API Caching**: Reduce API calls via intelligent caching
- **Recharge Engine (Suggestions)**: Intelligently size data recharges, as suggestions only.
- **Recharge Engine (Automated Recharging)**: Intelligently size data recharges, and applies them.

### 11.2 Integration Opportunities

- **Slack Integration**: Post daily summaries to Slack
- **Webhook Support**: Send data to external webhooks
- **Third-party APIs**: Integrate additional SIM management platforms
- **Google Data Studio**: Connect for advanced reporting

---

## 12. Glossary

- **Apps Script**: Google Apps Script, JavaScript-based platform for Google Workspace automation
- **CLASP**: Command Line Apps Script Projects, CLI tool for managing Apps Script projects
- **Deployment**: A single Google Sheet with its own script ID and configuration
- **Integration**: A distinct feature set (e.g., airtime tracking, QR generation)
- **Script Properties**: Key-value storage for configuration in Apps Script
- **Usage Type**: Either "airtime" (ZAR currency) or "data" (MB consumed)
- **MSISDN**: Mobile Station International Subscriber Directory Number (phone number)
- **FOTA**: Firmware Over The Air (Teltonika device management platform)
- **SIM**: Subscriber Identity Module (mobile SIM card)

---

## 13. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-03 | Initial | Created specification document |
| 2.0 | 2025-01-03 | Major Update | Implemented Option B flexible deployment model:<br>- Added 4 new integration types (Products, SIM Details, Analytics)<br>- Updated to support any combination of integrations per deployment<br>- Added WiFi Gateway deployment example<br>- Clarified airtime tracking is in ZAR currency<br>- Fixed QR Codes sheet to [APP] QR Codes<br>- Added 3 new modules (SimControlProducts.gs, SimControlSIMDetails.gs, SimControlAnalytics.gs)<br>- Added API documentation reference section<br>- Expanded configuration examples for 3 deployment types<br>- Updated script properties with granular integration controls<br>- Emphasized scalability for multiple Google accounts |

---

**Next Steps**:
1. Review and approve this specification
2. Create implementation roadmap
3. Begin Phase 1 implementation (core modules)
