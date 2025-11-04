# Implementation Roadmap

**Project**: Google Apps Script Multi-Integration System
**Last Updated**: 2025-11-04
**Spec Version**: 2.0

This roadmap provides a step-by-step implementation plan with ready-to-use prompts for LLM coding agents. Each phase includes context, tasks, and verification steps.

---

## Progress Tracker

| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| Phase 0: Setup | ✅ Complete | 2025-11-03 | Infrastructure and deployment folders created, script IDs configured |
| Phase 1: Core Modules | ✅ Complete | 2025-11-03 | Config, ApiClient, Logger, SheetHelpers, DateHelpers, RateLimiter implemented |
| Phase 2: SIM Management | ✅ Complete | 2025-11-03 | SimControlSims.gs and TriggerManager.gs implemented |
| Phase 3: Usage Tracking | ✅ Complete | 2025-11-03 | SimControlUsage.gs with airtime and data tracking implemented |
| Phase 4: Additional Integrations | ✅ Complete | 2025-11-03 | SimControlRecharges, SimControlProducts, SimControlSIMDetails, SimControlDescriptions implemented |
| Phase 5: Analytics | ✅ Complete | 2025-11-04 | SimControlAnalytics.gs with usage age analysis and high usage filter implemented |
| Phase 6: Optional Integrations | ✅ Complete | 2025-11-04 | FotaWeb.gs and QRCodeGenerator.gs implemented |
| Phase 7: Menu & Tests | ✅ Complete | 2025-11-04 | Menu.gs with dynamic menu builder and Tests.gs with validation functions implemented |
| Phase 8: Deployment & CI/CD | ✅ Complete | 2025-11-04 | CLASP configuration, GitHub Actions workflows, and deployment documentation complete |
| Phase 9: Testing & Validation | ✅ Complete | 2025-11-04 | TESTING.md documentation, ValidationSuite.gs automated tests, integration validation scripts complete |
| Phase 10: Migration & Rollout | ✅ Complete | 2025-11-04 | MIGRATION.md created, README updated, documentation finalized |

**Legend**:
- ⬜ Not Started
- 🚧 In Progress
- ✅ Complete
- ⚠️ Blocked
- 🔄 Needs Revision

---

## Phase 0: Setup Infrastructure

**Status**: ⬜ Not Started
**Estimated Time**: 1-2 hours
**Prerequisites**: None

### Objectives
- Create deployment folder structure
- Set up .claspignore
- Create initial config.json templates
- Install CLASP locally

### Tasks

#### Task 0.1: Create Deployment Folders

**Prompt for LLM Agent**:
```
Create the deployment folder structure as specified in spec.md section 3.1.

Create these directories:
- deployments/account1-airtime/
- deployments/account2-data/
- deployments/wifi-gateway/
- scripts/

Do not create the src/ directory yet - we'll build modules incrementally in later phases.
```

#### Task 0.2: Create .claspignore

**Prompt for LLM Agent**:
```
Create a .claspignore file in the repository root based on spec.md section 6.0.4.

The file should exclude:
- Version control files (.git, .gitignore)
- Documentation (*.md files)
- Legacy code (originals/ folder)
- Deployment configs (deployments/, .clasp.json, .clasprc)
- Scripts (scripts/)
- GitHub workflows (.github/)
- Node modules
- Local development files (.env, *.local, .DS_Store)
```

#### Task 0.3: Create Config Templates

**Prompt for LLM Agent**:
```
Create config.json files for the three deployment examples based on spec.md section 5.2:

1. deployments/account1-airtime/config.json - Airtime tracking only
2. deployments/account2-data/config.json - Full data management
3. deployments/wifi-gateway/config.json - SIM management focus

Use the exact examples from the spec.

Also create placeholder .clasp.json files in each deployment folder with the structure from spec.md section 6.1, using placeholder script IDs like "REPLACE_WITH_ACTUAL_SCRIPT_ID".
```

#### Task 0.4: Install CLASP

**Manual Step** (not for LLM):
```bash
# Install CLASP globally
npm install -g @google/clasp

# Verify installation
clasp --version

# Login to Google account
clasp login
```

### Verification
- [ ] Deployment folders exist with config.json and .clasp.json
- [ ] .claspignore file exists with proper exclusions
- [ ] CLASP is installed and authenticated

---

## Phase 1: Core Modules

**Status**: ⬜ Not Started
**Estimated Time**: 4-6 hours
**Prerequisites**: Phase 0 complete, spec.md reviewed

### Objectives
- Implement foundational modules that all integrations depend on
- Set up configuration management
- Implement API clients with rate limiting
- Create logging and utility functions

### Tasks

#### Task 1.1: Create src/ Directory and appsscript.json

**Prompt for LLM Agent**:
```
Create the src/ directory structure.

Then create src/appsscript.json based on the current file at src/appsscript.json in the repository.

Review the existing file and ensure it includes:
- Timezone: Africa/Johannesburg
- Enabled services: Drive v3, Docs v1
- All necessary OAuth scopes for:
  - External requests (SimControl API, FOTA API)
  - Spreadsheet access
  - Drive access
  - Script execution

Reference the manifest structure shown in spec.md if needed.
```

#### Task 1.2: Implement Config.gs

**Prompt for LLM Agent**:
```
Implement src/Config.gs based on spec.md section 4.1.

This module should:
1. Read script properties using PropertiesService.getScriptProperties()
2. Return a configuration object matching the schema in spec.md section 4.1
3. Include methods:
   - Config.get() - returns full config object
   - Config.getIntegration(type) - returns specific integration config
   - Config.getApiKey(service) - returns API key
4. Handle all integration types: airtime, data, recharges, products, simDetails, analytics, fotaweb, qrcode
5. Provide sensible defaults for missing properties

Add version comment at top: // Version: 1.0.0

Reference the configuration schema and script properties from spec.md sections 4.1 and 5.1.
```

#### Task 1.3: Implement Logger.gs

**Prompt for LLM Agent**:
```
Implement src/Logger.gs based on spec.md section 4.13.

This module should provide logging functions that write to a debug sheet:
1. Logger.log(message, data) - Info level logging
2. Logger.logError(message, error) - Error level logging
3. Logger.logToSheet(level, message, data) - Write to debug log sheet
4. Logger.clearDebugLog() - Clear debug log sheet
5. Logger.showDebugLog() - Navigate user to debug log sheet

The debug log sheet name should come from Config.get().defaults.logSheetName (default: "[APP] Debug Log")

Sheet structure: [Timestamp, Level, Message]

Add version comment at top: // Version: 1.0.0
```

#### Task 1.4: Implement SheetHelpers.gs

**Prompt for LLM Agent**:
```
Implement src/SheetHelpers.gs based on spec.md section 4.9.

This module should provide sheet manipulation utilities:
1. getOrCreateSheet(sheetName) - Get existing sheet or create new one
2. ensureUsageHeader(sheet, usageType) - Set proper column headers for usage sheets (airtime/data)
3. clearSheetData(sheetName) - Clear data while preserving headers
4. appendRowsInBatch(sheet, rows) - Efficient batch writing
5. getOrCreateFolder(folderName, parentFolder) - For Drive operations

Add version comment at top: // Version: 1.0.0

Reference how existing code handles sheet operations in originals/ folder.
```

#### Task 1.5: Implement DateHelpers.gs

**Prompt for LLM Agent**:
```
Implement src/DateHelpers.gs based on spec.md section 4.10.

This module should provide date/time utilities:
1. getYesterday() - Returns yesterday's date (YYYY-MM-DD format)
2. formatDate(date) - Format date for API calls (YYYY-MM-DD)
3. parseDate(dateString) - Parse date from string
4. getDateRange(startDate, endDate) - Generate array of dates between range

All dates should be handled in GMT timezone for consistency.

Add version comment at top: // Version: 1.0.0
```

#### Task 1.6: Implement RateLimiter.gs

**Prompt for LLM Agent**:
```
Implement src/RateLimiter.gs based on spec.md section 4.11.

This module should handle API rate limiting:
1. RateLimiter.checkAndWait() - Check if rate limited, wait if needed
2. RateLimiter.handleRateLimit(response) - Handle 429 response from API
3. RateLimiter.clearFlag() - Clear rate limit flag
4. RateLimiter.checkAppsScriptQuotaReset() - Check Apps Script quota

Use script properties to persist rate limit state:
- RATE_LIMIT_HIT (true/false)
- RATE_LIMIT_RESET_TIME (ISO timestamp)
- RATE_LIMIT_HIT_TIMESTAMP (ISO timestamp for Apps Script quota)

Reference the rate limiting logic in originals/wifi-gateway-sheet.gs for patterns.

Add version comment at top: // Version: 1.0.0
```

#### Task 1.7: Implement ApiClient.gs

**Prompt for LLM Agent**:
```
Implement src/ApiClient.gs based on spec.md sections 4.2 and 3.3.

This module should provide unified API clients:

1. ApiClient.call(baseUrl, endpoint, options) - Generic HTTP client
   - Calls RateLimiter.checkAndWait() before making request
   - Handles 429 rate limit responses via RateLimiter.handleRateLimit()
   - Logs requests/responses via Logger
   - Returns parsed JSON or null on error

2. SimControlAPI.call(endpoint, method, payload) - SimControl API wrapper
   - Base URL: https://app.simcontrol.co.za/api
   - Uses 'x-api-key' header from Config.getApiKey('simcontrol')
   - Handles pagination (returns meta with has_next_page?)
   - See simcontrol-api-docs.json for endpoint reference

3. FotaWebAPI.call(endpoint, method) - FOTA Web API wrapper
   - Base URL: https://api.teltonika.lt
   - Uses Bearer token from Config.getApiKey('fotaweb')
   - See fotaweb-api-docs.json for endpoint reference

Add version comment at top: // Version: 1.0.0

Reference existing API call patterns from originals/ folder.
```

### Verification
- [ ] All core modules created in src/
- [ ] Each file has version comment
- [ ] Config.gs can read script properties
- [ ] Logger writes to debug sheet successfully
- [ ] SheetHelpers can create and manipulate sheets
- [ ] ApiClient can make test calls (use /organisations/balance endpoint)

---

## Phase 2: SIM Management

**Status**: ⬜ Not Started
**Estimated Time**: 2-3 hours
**Prerequisites**: Phase 1 complete

### Objectives
- Implement SIM retrieval functions
- Handle pagination
- Support different SIM filters (active, suspended, all)

### Tasks

#### Task 2.1: Implement SimControlSims.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlSims.gs based on spec.md section 4.6.

This module should provide SIM retrieval functions:

1. getAllSIMs() - Fetch all SIMs with pagination
   - Uses SimControlAPI.call('/sims', 'GET', null)
   - Handles pagination (page, page_size parameters)
   - Returns array of all SIM objects
   - Logs progress via Logger

2. getActiveSIMs() - Fetch only active/managed SIMs
   - Uses managed='active' parameter
   - Otherwise same as getAllSIMs()

3. getSuspendedSIMs() - Fetch only suspended SIMs
   - Uses managed='suspended' parameter
   - Otherwise same as getAllSIMs()

4. getSIMById(simId) - Fetch single SIM details
   - Uses /sims/{id} endpoint
   - Returns single SIM object or null

Reference the SIM retrieval logic from originals/wifi-gateway-sheet.gs (lines 298-369).

Add version comment at top: // Version: 1.0.0
```

#### Task 2.2: Implement TriggerManager.gs

**Prompt for LLM Agent**:
```
Implement src/TriggerManager.gs based on spec.md section 4.12.

This module should handle Apps Script triggers:

1. setupDailyTriggers() - Create daily triggers for enabled integrations
   - Read Config to see which integrations are enabled
   - Create triggers for airtime (if enabled) at 6 AM
   - Create triggers for data (if enabled) at 7 AM
   - Use ScriptApp.newTrigger()

2. deleteAllTriggers() - Remove all project triggers
   - Use ScriptApp.getProjectTriggers() and ScriptApp.deleteTrigger()

3. listActiveTriggers() - Show current triggers (for debugging)
   - Returns array of trigger info

4. scheduleNextHistoricalRun(functionName, delaySeconds) - Schedule continuation
   - For long-running jobs that need to resume
   - Creates a time-based trigger to run after delay

5. deleteThisTrigger(functionName) - Delete specific trigger by function name

Reference trigger management from originals/wifi-gateway-sheet.gs.

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] Can retrieve all SIMs successfully
- [ ] Pagination works correctly
- [ ] Can filter by active/suspended status
- [ ] Triggers can be created and deleted

---

## Phase 3: Usage Tracking (Core Integrations)

**Status**: ⬜ Not Started
**Estimated Time**: 4-5 hours
**Prerequisites**: Phases 1-2 complete

### Objectives
- Implement airtime usage tracking (ZAR currency)
- Implement data usage tracking (MB)
- Support historical and daily fetching
- Handle MSISDN exclusions

### Tasks

#### Task 3.1: Implement SimControlUsage.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlUsage.gs based on spec.md section 4.3.

This module implements the generic usage fetcher for both airtime and data.

Key functions:

1. fetchAllHistoricalUsage(usageType)
   - usageType parameter: 'airtime' or 'data'
   - Get config for the usage type from Config.getIntegration(usageType)
   - Check if integration is enabled, return early if not
   - Get SIMs from getActiveSIMs() or getAllSIMs() depending on config
   - Filter out excluded MSISDNs from config
   - Loop through dates from startDate to yesterday
   - For each SIM and date, call /usage-details endpoint
   - Extract either airtime_usage (ZAR) or data_usage (MB) based on usageType
   - Write rows to sheet using SheetHelpers
   - Handle execution time limits (use continuation triggers if needed)
   - Save progress to LAST_PROCESSED_DATE script property

2. fetchAirtimeUsage() - Wrapper that calls fetchAllHistoricalUsage('airtime')

3. fetchDataUsage() - Wrapper that calls fetchAllHistoricalUsage('data')

4. fetchPreviousDayUsage(usageType)
   - Fetch only yesterday's data
   - No continuation needed (single day)

5. fetchPreviousDayAirtime() - Wrapper for airtime

6. fetchPreviousDayData() - Wrapper for data

7. clearAirtimeSheet() - Clear airtime sheet

8. clearDataSheet() - Clear data sheet

Reference the implementation from originals/wifi-gateway-sheet.gs (fetchAllHistoricalUsage function) and originals/main-airtime.gs.

IMPORTANT: The main difference between airtime and data is:
- Airtime tracks airtime_usage field (ZAR currency value)
- Data tracks data_usage field (MB value)

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] Can fetch historical airtime usage
- [ ] Can fetch historical data usage
- [ ] MSISDN exclusions work correctly
- [ ] Previous day fetch works
- [ ] Data writes to correct sheets with proper headers
- [ ] Execution time limits handled with continuation

---

## Phase 4: Additional Integrations

**Status**: ⬜ Not Started
**Estimated Time**: 3-4 hours
**Prerequisites**: Phase 3 complete

### Objectives
- Implement recharge tracking
- Implement product catalog
- Implement full SIM details export
- Implement SIM description bulk updates

### Tasks

#### Task 4.1: Implement SimControlRecharges.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlRecharges.gs based on spec.md section 4.4.

This module handles recharge tracking:

1. fetchRecharges() - Fetch all recharge history
   - Get config from Config.getIntegration('recharges')
   - Check if enabled
   - Use /recharge endpoint with pagination
   - Write to configured sheet

2. fetchRechargesBetweenDates(startDate, endDate) - Date-filtered recharges
   - Add start_date and end_date parameters to API call
   - Handle pagination

3. fetchRecentRechargesToSheet() - Convenience function for today & yesterday
   - Calculate date range
   - Call fetchRechargesBetweenDates()

Reference originals/wifi-gateway-sheet.gs (fetchRechargesBetweenDates function, lines 6-53).

Add version comment at top: // Version: 1.0.0
```

#### Task 4.2: Implement SimControlProducts.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlProducts.gs based on spec.md section 4.5.

This module manages product catalog:

1. createRechargeProductSheet() - Fetch and list available products
   - Get config from Config.getIntegration('products')
   - Check if enabled
   - Get networkIds and productType from config
   - Loop through each network ID
   - Call /products endpoint with network_id and product_type filters
   - Handle pagination
   - Write all products to configured sheet
   - Dynamic headers from API response

2. getProductsByNetwork(networkId) - Filter by network (helper function)

3. getProductsByType(productType) - Filter by type (helper function)

Reference originals/wifi-gateway-sheet.gs (createRechargeProductSheet function, lines 716-771).

Add version comment at top: // Version: 1.0.0
```

#### Task 4.3: Implement SimControlSIMDetails.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlSIMDetails.gs based on spec.md section 4.6.

This module exports complete SIM details:

1. fetchAllSIMDetailsToSheet() - Export all SIM fields
   - Get config from Config.getIntegration('simDetails')
   - Check if enabled
   - Get all SIMs using getAllSIMs()
   - Extract all field names from first SIM object
   - Create headers from field names
   - Write all SIM data to configured sheet
   - Serialize nested objects to JSON

2. refreshSIMDetails() - Update existing sheet (clear and re-fetch)

Reference originals/wifi-gateway-sheet.gs (fetchAllSIMDetailsToSheet function, lines 979-1020).

Add version comment at top: // Version: 1.0.0
```

#### Task 4.4: Implement SimControlDescriptions.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlDescriptions.gs based on spec.md section 4.8.

This module handles bulk SIM description updates:

1. updateSimDescriptionsFromSheet()
   - Read from active sheet (user is expected to have ICCID in column D, description in column Y)
   - Loop through rows with execution time limit
   - For each row with ICCID and description:
     - Sanitize description (remove smart quotes, zero-width chars)
     - Auto-format phone numbers (add "WGID: " prefix if matches pattern /^\+\d{10,}$/)
     - PATCH to /sims?iccid={iccid} with {description: sanitizedDesc}
   - Save progress to CURRENT_ROW_INDEX script property
   - If approaching timeout, schedule continuation trigger

2. sanitizeDescription(description) - Remove special characters

3. autoFormatPhoneNumbers(description) - Add WGID prefix if phone number

Reference originals/wifi-gateway-sheet.gs (updateSimDescriptionsFromSheet function, lines 773-848).

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] Can fetch recharge history with date filtering
- [ ] Product catalog fetches and displays correctly
- [ ] SIM details export includes all fields
- [ ] Description updates work with sanitization and formatting
- [ ] Continuation triggers work for long-running updates

---

## Phase 5: Analytics

**Status**: ⬜ Not Started
**Estimated Time**: 2-3 hours
**Prerequisites**: Phase 3 complete (needs usage data)

### Objectives
- Implement usage age analysis
- Implement high usage filtering
- Support configurable thresholds

### Tasks

#### Task 5.1: Implement SimControlAnalytics.gs

**Prompt for LLM Agent**:
```
Implement src/SimControlAnalytics.gs based on spec.md section 4.7.

This module provides usage analytics:

1. generateSIMUsageSummary() / analyzeUsageAge()
   - Get config from Config.getIntegration('analytics')
   - Check if usageAgeAnalysis is enabled
   - Get all SIMs using getAllSIMs()
   - Get data usage sheet (from data integration config)
   - For each SIM, find last usage date (last row where usage > 0)
   - Calculate days since last usage
   - Determine SIM status (ACTIVE, SUSPENDED)
   - Write to usage age analysis sheet: [MSISDN, Status, Last Usage Date, Days Since Last Usage]

2. extractHighUsage()
   - Get config from Config.getIntegration('analytics')
   - Check if highUsageFilter is enabled
   - Get threshold from config (default 1500 MB)
   - Read data usage sheet
   - Filter rows where any usage value >= threshold
   - Write to high usage sheet

3. identifyInactiveSIMs(days) - Find SIMs with no usage for X days
   - Helper function using usage age data
   - Returns array of SIM MSISDNs

Reference originals/wifi-gateway-sheet.gs (generateSIMUsageSummary function, lines 641-710).

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] Usage age analysis correctly calculates days since last usage
- [ ] High usage filter correctly identifies SIMs exceeding threshold
- [ ] Inactive SIM identification works

---

## Phase 6: Optional Integrations

**Status**: ⬜ Not Started
**Estimated Time**: 2-3 hours
**Prerequisites**: Phase 1 complete

### Objectives
- Implement FOTA Web integration
- Implement QR code generator

### Tasks

#### Task 6.1: Implement FotaWeb.gs

**Prompt for LLM Agent**:
```
Implement src/FotaWeb.gs based on spec.md section 4.7 (old numbering).

This module integrates with Teltonika FOTA Web API:

1. fetchFotaWebData()
   - Get config from Config.getIntegration('fotaweb')
   - Check if enabled
   - Call FOTA Web API using FotaWebAPI.call()
   - Write device data to configured sheet

2. copyFOTAtoDeviceSIMAss()
   - Copy FOTA data to device-SIM association sheet
   - Helper function for data organization

3. clearFotaSheet() - Clear FOTA data sheet

Reference originals/fotaweb-integration.gs for the implementation pattern.

Add version comment at top: // Version: 1.0.0
```

#### Task 6.2: Implement QRCodeGenerator.gs

**Prompt for LLM Agent**:
```
Implement src/QRCodeGenerator.gs based on spec.md section 4.8 (old numbering).

This module generates WhatsApp QR codes:

1. generateWhatsAppQRCodes()
   - Get config from Config.getIntegration('qrcode')
   - Check if enabled
   - Read messages from active sheet (starting row 9, column A)
   - For each message:
     - Create WhatsApp URL with encoded message
     - Generate QR code using api.qrserver.com
     - Save QR image to Google Drive folder (from config)
     - Insert image in sheet (column M) using =IMAGE() formula
   - Log progress

2. uploadQRCodeToDrive(blob, folderName) - Helper function

3. clearQRSheet() - Clear QR code sheet

Reference originals/generate-whatsapp-QR-codes.gs.

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] FOTA Web data fetches correctly
- [ ] QR codes generate and save to Drive
- [ ] QR codes display in sheet

---

## Phase 7: Menu & Tests

**Status**: ⬜ Not Started
**Estimated Time**: 2-3 hours
**Prerequisites**: All previous phases complete

### Objectives
- Implement dynamic menu based on enabled integrations
- Create comprehensive test functions
- Ensure proper menu organization

### Tasks

#### Task 7.1: Implement Menu.gs

**Prompt for LLM Agent**:
```
Implement src/Menu.gs based on spec.md sections 2.4 and 4.14.

This module creates a dynamic menu based on enabled integrations:

1. onOpen()
   - Get config using Config.get()
   - Create main menu: "SimControl Integration"
   - For each enabled integration, add corresponding submenu:

     If airtime enabled:
       - 📞 Airtime Usage submenu
         - Download All Historical Data (calls fetchAirtimeUsage)
         - Fetch Previous Day Only (calls fetchPreviousDayAirtime)
         - Clear Airtime Sheet (calls clearAirtimeSheet)

     If data enabled:
       - 📊 Data Usage submenu
         - Download All Historical Data (calls fetchDataUsage)
         - Fetch Previous Day Only (calls fetchPreviousDayData)
         - [If recharges enabled] Fetch Recharges (calls fetchRecharges)
         - [If products enabled] Create Product Catalog (calls createRechargeProductSheet)
         - [If high usage analysis enabled] Extract High Usage (calls extractHighUsage)
         - Clear Data Sheet (calls clearDataSheet)

     📱 SIM Management submenu (always shown):
       - Update SIM Descriptions (calls updateSimDescriptionsFromSheet)
       - Export All SIM Details (calls fetchAllSIMDetailsToSheet if enabled)
       - Analyze Usage Age (calls analyzeUsageAge if analytics enabled)

     If fotaweb enabled:
       - 🌐 FOTA Web submenu
         - Fetch Device Data (calls fetchFotaWebData)
         - Clear FOTA Sheet (calls clearFotaSheet)

     If qrcode enabled:
       - 📲 QR Codes submenu
         - Generate WhatsApp QR Codes (calls generateWhatsAppQRCodes)
         - Clear QR Sheet (calls clearQRSheet)

     🔧 Utilities submenu (always shown):
       - Test API Connection (calls testSimcontrolApiKey)
       - View Debug Log (calls Logger.showDebugLog)
       - Clear Debug Log (calls Logger.clearDebugLog)
       - Setup Daily Triggers (calls setupDailyTriggers)
       - Cancel Running Jobs (calls cancelExecution)

2. Helper functions for building submenus (optional, for code organization)

Reference spec.md section 2.4 for the complete menu structure.

Add version comment at top: // Version: 1.0.0
```

#### Task 7.2: Implement Tests.gs

**Prompt for LLM Agent**:
```
Implement src/Tests.gs based on spec.md section 4.15.

This module provides test and validation functions:

1. testSimcontrolApiKey()
   - Test API connectivity using /organisations/balance endpoint
   - Log success or failure
   - Show result to user via toast

2. testUpdateSimDescription()
   - Test description update with a known ICCID
   - Log result

3. testSingleSimDayUsage()
   - Test fetching usage for one SIM on one date
   - Useful for debugging

4. testFetchRechargesToLog()
   - Test recharge fetch for a date range
   - Log results without writing to sheet

5. grantTriggerPermissions()
   - Helper to grant permissions for triggers
   - Shows authorization dialog

6. cancelExecution()
   - Set CANCEL_SIM_JOB script property to "true"
   - Used to stop long-running jobs
   - Show toast notification

7. setScriptProperty(key, value)
   - Helper for CLASP automation
   - Sets a single script property
   - For use with clasp run command

8. getScriptProperties()
   - Returns all script properties as JSON
   - For verification with clasp run command

9. clearScriptProperties()
   - Deletes all script properties
   - For cleanup

Reference spec.md section 6.0.9 for the CLASP helper functions.

Add version comment at top: // Version: 1.0.0
```

### Verification
- [ ] Menu appears in Google Sheets on open
- [ ] Only enabled integrations show in menu
- [ ] All menu items work correctly
- [ ] Test functions execute successfully
- [ ] API connection test passes

---

## Phase 8: Deployment & CI/CD

**Status**: ⬜ Not Started
**Estimated Time**: 3-4 hours
**Prerequisites**: Phases 1-7 complete

### Objectives
- Set up CLASP for local deployment
- Create deployment helper scripts
- Configure GitHub Actions for automated deployment
- Test deployment to all three configurations

### Tasks

#### Task 8.1: Create Deployment Scripts

**Prompt for LLM Agent**:
```
Create the deployment helper scripts as specified in spec.md section 7.4.7 and 7.4.8.

1. Create scripts/deploy.sh with the exact content from spec.md section 7.4.7
   - Make sure it's executable (chmod +x)
   - Supports deploying to account1-airtime, account2-data, wifi-gateway, or all

2. Create scripts/setup-properties.sh with the exact content from spec.md section 7.4.8
   - Make sure it's executable (chmod +x)
   - Reads config.json and sets script properties via CLASP

Also update the config.json files in each deployment folder to use the final property names matching what we implemented in the code.
```

#### Task 8.2: Manual CLASP Setup

**Manual Steps** (not for LLM):
```bash
# For each deployment, you need to:

# 1. Create a Google Sheet
# 2. Open Apps Script editor (Extensions → Apps Script)
# 3. Get Script ID from Project Settings or URL
# 4. Update deployments/[deployment-name]/.clasp.json with the Script ID

# Example for account1-airtime:
cd deployments/account1-airtime
# Edit .clasp.json and replace REPLACE_WITH_ACTUAL_SCRIPT_ID

# 5. Deploy code
clasp push --force

# 6. Set up script properties
cd ../..
./scripts/setup-properties.sh deployments/account1-airtime

# 7. Verify in browser
cd deployments/account1-airtime
clasp open

# Repeat for account2-data and wifi-gateway
```

#### Task 8.3: Create GitHub Actions Workflow

**Prompt for LLM Agent**:
```
Create .github/workflows/deploy.yml based on spec.md section 6.2.

The workflow should:
1. Trigger on push to main branch (only if src/ or deployments/ change)
2. Also support manual workflow_dispatch with deployment selector
3. Use matrix strategy to deploy to multiple deployments in parallel
4. Install Node.js 18
5. Install CLASP globally
6. Decode base64 CLASPRC secret for authentication
7. Run clasp push --force from each deployment directory
8. Verify deployment with clasp version

Reference the exact workflow specification from spec.md section 6.2.
```

#### Task 8.4: Configure GitHub Secrets

**Manual Steps** (not for LLM):
```bash
# Generate CLASPRC for each Google account:
cat ~/.clasprc | base64 -w 0

# Add to GitHub repository secrets:
# - CLASPRC_account1_airtime
# - CLASPRC_account2_data
# - CLASPRC_wifi_gateway

# Go to repository → Settings → Secrets and variables → Actions → New repository secret
```

### Verification
- [ ] deploy.sh script works locally
- [ ] setup-properties.sh sets all properties correctly
- [ ] Can deploy to each deployment manually
- [ ] GitHub Actions workflow runs successfully
- [ ] Automated deployment works on push to main

---

## Phase 9: Testing & Validation

**Status**: ⬜ Not Started
**Estimated Time**: 4-6 hours
**Prerequisites**: Phase 8 complete

### Objectives
- Test all integrations end-to-end
- Verify data accuracy
- Test error handling and edge cases
- Validate rate limiting and continuation

### Tasks

#### Task 9.1: Test Airtime Integration

**Manual Testing Checklist**:
- [ ] Deploy to account1-airtime
- [ ] Menu shows only Airtime submenu
- [ ] Historical fetch starts and continues correctly
- [ ] Data writes to [API] Airtime Usage sheet
- [ ] Excluded MSISDNs are filtered out
- [ ] Previous day fetch works
- [ ] Airtime values are in ZAR currency
- [ ] Rate limiting triggers correctly if needed
- [ ] Continuation triggers work for long runs

#### Task 9.2: Test Data Integration

**Manual Testing Checklist**:
- [ ] Deploy to account2-data
- [ ] Menu shows Data + Recharges + Products + High Usage
- [ ] Historical fetch works
- [ ] Data writes to [API] Data Usage sheet
- [ ] Data values are in MB
- [ ] Recharge fetch populates [API] Recharges sheet
- [ ] Product catalog populates [API] Recharge Product IDs
- [ ] High usage filter creates [APP] High Usage sheet with correct threshold
- [ ] Previous day fetch works

#### Task 9.3: Test WiFi Gateway Integration

**Manual Testing Checklist**:
- [ ] Deploy to wifi-gateway
- [ ] Menu shows Data + Products + SIM Details + Usage Age Analysis
- [ ] Data fetch works
- [ ] Product catalog works
- [ ] SIM details export populates [API] SimControl Data sheet with all fields
- [ ] Usage age analysis creates [APP] Usage Age Analysis sheet
- [ ] Days since last usage calculated correctly
- [ ] SIM status (ACTIVE/SUSPENDED) shown correctly

#### Task 9.4: Test Edge Cases

**Manual Testing Checklist**:
- [ ] Empty API responses handled gracefully
- [ ] 429 rate limit sets flag and schedules retry
- [ ] Apps Script quota exceeded triggers 24-hour cooldown
- [ ] Invalid API key shows clear error
- [ ] Network errors logged properly
- [ ] Execution timeout triggers continuation
- [ ] Cancel job functionality works
- [ ] Debug log shows helpful information

### Verification
- [ ] All three deployments working correctly
- [ ] No errors in execution logs
- [ ] Data accuracy verified against API
- [ ] All edge cases handled

---

## Phase 10: Migration & Rollout

**Status**: ✅ Complete
**Estimated Time**: 2-4 hours (documentation complete, deployment pending)
**Prerequisites**: Phase 9 complete with successful testing

### Objectives
- ✅ Create tactical deployment orchestration plan
- ✅ Document production migration procedures
- ✅ Provide rollback strategies
- ⏳ Execute deployment (user action required)

### Deliverables Created

1. **DEPLOYMENT_ORCHESTRATION.md** (25KB) - Complete tactical deployment plan
   - 7-phase deployment process
   - Pre-deployment audit procedures
   - Step-by-step code deployment via CLASP
   - Script properties configuration guide
   - Testing and validation procedures
   - Trigger re-enablement
   - 7-day monitoring plan
   - 3-level rollback procedures

2. **DEPLOYMENT_QUICKSTART.md** (7KB) - Quick reference card
   - One-page deployment summary
   - Script properties templates
   - Success checklist
   - Common issues and solutions

3. **scripts/setup-properties.sh** - Property configuration helper
   - Reads config.json for each deployment
   - Displays properties to set
   - Validates configuration

4. **NEW_SESSION_CONTEXT.md** - Context for future LLM sessions
   - Project overview and completion status
   - Current state of all files
   - Next steps and deployment guidance
   - Instructions for new AI assistants

### Tasks

#### Task 10.1: Tactical Deployment Plan ✅

**Completed**: Created DEPLOYMENT_ORCHESTRATION.md with 7 deployment phases:

- **Phase 0: Pre-Deployment Audit** (30-60 min)
  - Audit script for documenting current state
  - Script ID collection from production sheets
  - Data export and backup procedures
  - Sheet name mapping verification
  - Trigger documentation

- **Phase 1: Deployment Preparation** (15-30 min)
  - Full backup procedures (sheets, code, data)
  - Maintenance window scheduling
  - **Critical**: Disable existing triggers before code deployment

- **Phase 2: Code Deployment** (5-10 min)
  - Update `.clasp.json` with production Script IDs
  - Deploy via `clasp push --force`
  - Verification in Apps Script editor

- **Phase 3: Configure Script Properties** (5-10 min)
  - Manual property setting (recommended approach)
  - Exact property names and value formats
  - Validation procedures

- **Phase 4: Testing & Validation** (15-30 min)
  - Menu appearance verification
  - Full test suite execution
  - Small data fetch tests (previous day only)
  - Post-deployment validation script
  - Existing data compatibility check

- **Phase 5: Re-enable Triggers** (5 min)
  - Setup daily triggers via menu
  - Permission granting
  - Trigger schedule verification

- **Phase 6: Monitor & Stabilize** (7 days)
  - Daily Debug Log monitoring
  - Trigger execution verification
  - Data continuity checks
  - Rate limit monitoring

- **Phase 7: Rollback Procedures** (if needed)
  - Level 1: Configuration rollback (2-5 min)
  - Level 2: Code rollback (5-10 min)
  - Level 3: Full rollback to backup (15-30 min)

#### Task 10.2: Deployment Order Strategy ✅

**Recommended deployment sequence** (to minimize risk):

1. **wifi-gateway** (deploy first)
   - Test bed for multi-integration system
   - Non-critical timing
   - Wait 24-48 hours, monitor

2. **account1-airtime** (deploy second)
   - Simplest configuration (single integration)
   - Easy to validate
   - Wait 24-48 hours, monitor

3. **account2-data** (deploy last)
   - Most complex (all integrations)
   - Deploy after learning from previous two
   - Monitor closely for 7 days

#### Task 10.3: Documentation Complete ✅

All deployment documentation created:
- ✅ DEPLOYMENT_ORCHESTRATION.md - Detailed tactical plan
- ✅ DEPLOYMENT_QUICKSTART.md - Quick reference
- ✅ README.md updated with deployment links
- ✅ MIGRATION.md - User training and rollout procedures
- ✅ TESTING.md - Validation procedures
- ✅ scripts/setup-properties.sh - Configuration helper

#### Task 10.4: Cleanup Complete ✅

Legacy files removed from src/:
- ✅ Deleted `helper-functions.gs` (functionality moved to SheetHelpers, DateHelpers)
- ✅ Deleted `main.gs` (old monolithic code)
- ✅ Deleted `test-functions.gs` (replaced by Tests.gs and ValidationSuite.gs)
- ✅ Final module count: 19 .gs files + appsscript.json

### Verification
- ✅ DEPLOYMENT_ORCHESTRATION.md created and comprehensive
- ✅ DEPLOYMENT_QUICKSTART.md created for quick reference
- ✅ Script property helper script created
- ✅ README.md updated with deployment guidance
- ✅ Legacy files cleaned up
- ✅ All documentation complete
- ⏳ Production deployment pending user action

### Next Steps (User Action Required)

**Ready to deploy to production:**

1. **Read DEPLOYMENT_ORCHESTRATION.md completely** - Understand all 7 phases

2. **Schedule maintenance windows** - Off-hours recommended for each deployment

3. **Collect production Script IDs**:
   ```
   For each Google Sheet:
   - Open sheet → Extensions → Apps Script
   - Copy Script ID from URL or Project Settings
   - Update corresponding .clasp.json file
   ```

4. **Start with Phase 0 Audit**:
   - Run audit script in each production sheet (see DEPLOYMENT_ORCHESTRATION.md Phase 0.2)
   - Document current state (sheets, triggers, properties, data)
   - Export backups

5. **Follow DEPLOYMENT_ORCHESTRATION.md sequentially** through all 7 phases

6. **Use DEPLOYMENT_QUICKSTART.md** as a reference card during deployment

**Estimated time**: ~1.5 hours per deployment + 7 days monitoring
- [ ] Old code archived in originals/
- [ ] Documentation updated
- [ ] Users trained on new system

---

## Completion Criteria

Project is considered complete when:
- ✅ All 10 phases marked as "Complete"
- ✅ All three deployment configurations working in production
- ✅ No critical bugs or errors
- ✅ Documentation complete and accurate
- ✅ Users successfully using new system
- ✅ Old code archived
- ✅ CI/CD pipeline operational

---

## Future Enhancements

After completing all phases, consider these enhancements from spec.md section 11:

**Priority 1** (Next Quarter):
- [ ] Alert system for high usage or errors
- [ ] Recharge suggestions engine based on usage patterns
- [ ] Data visualization dashboard

**Priority 2** (Future):
- [ ] Automated recharging based on thresholds
- [ ] Slack integration for daily summaries
- [ ] Additional analytics reports

---

## Notes & Lessons Learned

*Document any issues, gotchas, or insights discovered during implementation here*

**Example**:
- Date: 2025-01-05
- Issue: Script properties not persisting after deployment
- Solution: Need to run setup-properties.sh after each clasp push
- Impact: Added reminder to deployment checklist

---

## Quick Reference: Common LLM Prompts

### Starting a New Phase

```
I'm working on the Google Apps Script Multi-Integration project. Please read:
1. spec.md for overall architecture
2. ROADMAP.md Phase [X] for specific tasks

I want to implement [Phase Name]. Please proceed with Task [X.Y]: [Task Name]

Use the implementation instructions provided in the roadmap.
```

### Debugging Issues

```
I'm working on the Google Apps Script Multi-Integration project.

Current issue: [describe issue]

Affected module: [module name]
Expected behavior: [what should happen]
Actual behavior: [what is happening]

Please review the module against spec.md section [X.Y] and suggest fixes.
Include version comments when updating code.
```

### Adding New Features

```
I want to add a new integration to the Google Apps Script Multi-Integration project.

Integration type: [name]
Purpose: [description]
API endpoint: [if applicable]
Target sheet: [sheet name with [API] or [APP] prefix]

Please:
1. Review spec.md section 2.2 for integration types
2. Suggest where this fits in the architecture
3. Create the necessary module following existing patterns
4. Update Config.gs to support the new integration
5. Update Menu.gs to add menu items
```

---

**End of Roadmap**
