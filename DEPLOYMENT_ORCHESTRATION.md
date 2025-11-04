# Deployment Orchestration Plan

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Purpose**: Tactical plan for deploying new codebase to existing production Google Sheets

---

## 🎯 Executive Summary

This document provides a detailed, step-by-step orchestration plan for migrating existing production Google Sheets from legacy code to the new modular codebase. Each production sheet already contains data and has running scripts that must be carefully replaced without data loss or extended downtime.

### Deployment Scope

| Deployment | Script ID | Legacy Code File | Status |
|------------|-----------|------------------|--------|
| **account1-airtime** | `1JarEOj...876NYo` | `main-airtime.gs` | Production |
| **account2-data** | TBD | `main-data.gs` | Production |
| **wifi-gateway** | TBD | `wifi-gateway-sheet.gs` | Production |

### Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during deployment | Critical | Full backups before any changes |
| Existing triggers firing during deployment | High | Disable triggers before code update |
| Sheet name mismatches | Medium | Pre-deployment sheet mapping audit |
| Script property errors | Medium | Validation script before deployment |
| Column order mismatches | Low | Code reads dynamic headers |

---

## 📋 Phase 0: Pre-Deployment Audit

**Duration**: 30-60 minutes per deployment
**When**: 1-2 days before deployment

### 0.1 Audit Current State

For **each production Google Sheet**, document:

1. **Open the Google Sheet** in browser
2. **Document Current Script ID**
   - Extensions → Apps Script
   - Copy the Script ID from the URL
   - Update corresponding `.clasp.json` file

3. **Document Existing Sheets**
   - List all sheet tabs (names)
   - Note which sheets contain data
   - Note column headers and column count for data sheets

4. **Document Existing Triggers**
   - Apps Script Editor → Triggers (clock icon)
   - List all triggers: function name, schedule, last run
   - Screenshot for reference

5. **Document Script Properties**
   - Apps Script Editor → Project Settings → Script Properties
   - Export all properties to a text file (backup)

6. **Document Data Volume**
   - For each data sheet, note last row number
   - Note date range of existing data

7. **Export Current Code**
   - Apps Script Editor → Download as ZIP
   - Save as `legacy-backup-[deployment]-[date].zip`

8. **Export Current Data**
   - For critical data sheets, File → Download → CSV
   - Save as `data-backup-[sheetname]-[date].csv`

### 0.2 Pre-Deployment Audit Script

Create a Google Apps Script function to run in the existing sheet **before** deployment:

```javascript
/**
 * Run this in the CURRENT (legacy) script before deployment
 * Paste into Apps Script editor and run once
 */
function auditCurrentState() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties().getProperties();
  var triggers = ScriptApp.getProjectTriggers();

  var report = [];
  report.push('=== PRE-DEPLOYMENT AUDIT REPORT ===');
  report.push('Date: ' + new Date().toISOString());
  report.push('Spreadsheet ID: ' + ss.getId());
  report.push('Spreadsheet Name: ' + ss.getName());
  report.push('');

  // List all sheets
  report.push('=== SHEETS ===');
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    report.push('- ' + sheet.getName() + ' (rows: ' + sheet.getLastRow() + ', cols: ' + sheet.getLastColumn() + ')');
  }
  report.push('');

  // List script properties
  report.push('=== SCRIPT PROPERTIES ===');
  for (var key in props) {
    report.push('- ' + key + ' = ' + props[key]);
  }
  report.push('');

  // List triggers
  report.push('=== TRIGGERS ===');
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    report.push('- Function: ' + trigger.getHandlerFunction());
    report.push('  Type: ' + trigger.getEventType());
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      report.push('  Schedule: Time-based');
    }
  }
  report.push('');

  // Create audit sheet
  var auditSheet = ss.getSheetByName('[AUDIT] Pre-Deployment');
  if (auditSheet) {
    ss.deleteSheet(auditSheet);
  }
  auditSheet = ss.insertSheet('[AUDIT] Pre-Deployment');

  // Write report
  var reportText = report.join('\n');
  auditSheet.getRange(1, 1).setValue(reportText);
  auditSheet.autoResizeColumn(1);

  Logger.log(reportText);
  SpreadsheetApp.getUi().alert('Audit complete. See [AUDIT] Pre-Deployment sheet.');

  return reportText;
}
```

**Action Items for Each Deployment:**
- [ ] account1-airtime: Run audit script, save output
- [ ] account2-data: Run audit script, save output
- [ ] wifi-gateway: Run audit script, save output

### 0.3 Sheet Name Mapping

Document the mapping between legacy sheet names and new sheet names:

**account1-airtime** (Expected):
```
Legacy Name               → New Name                 | Action
────────────────────────────────────────────────────────────────
[API] Airtime Usage       → [API] Airtime Usage     | Keep (no change)
[APP] Debug Log           → [APP] Debug Log         | Keep (no change)
[any other sheets]        → [preserve]              | Keep (untouched)
```

**account2-data** (Expected):
```
Legacy Name               → New Name                 | Action
────────────────────────────────────────────────────────────────
[API] Data Usage          → [API] Data Usage        | Keep (no change)
[API] Recharges           → [API] Recharges         | Keep (no change)
[API] Recharge Product IDs → [API] Recharge Product IDs | Keep (no change)
[APP] High Usage          → [APP] High Usage        | Keep (no change)
[APP] Debug Log           → [APP] Debug Log         | Keep (no change)
```

**wifi-gateway** (Expected):
```
Legacy Name               → New Name                 | Action
────────────────────────────────────────────────────────────────
[API] Data Usage          → [API] Data Usage        | Keep (no change)
[API] SimControl Data     → [API] SimControl Data   | Keep (no change)
[API] Recharge Product IDs → [API] Recharge Product IDs | Keep (no change)
[APP] Usage Age Analysis  → [APP] Usage Age Analysis | Keep (no change)
[APP] Debug Log           → [APP] Debug Log         | Keep (no change)
```

**NOTE**: The new codebase uses the same sheet names as configured in `config.json`, so typically **no sheet renaming is required**. However, if legacy sheets use different names, they must be renamed before deployment OR the `config.json` must be updated to match legacy names.

---

## 🚀 Phase 1: Deployment Preparation

**Duration**: 15-30 minutes per deployment
**When**: Day of deployment, during maintenance window

### 1.1 Backup Everything

For each deployment:

1. **Create Full Spreadsheet Copy**
   - File → Make a copy
   - Name: `[BACKUP] [Original Name] - [Date]`
   - Move to a "Backups" folder in Drive

2. **Export Script Properties**
   ```bash
   # If you have CLASP configured locally
   cd deployments/account1-airtime
   clasp open
   # Manually copy script properties from Project Settings
   ```

3. **Git Commit Current State**
   ```bash
   cd /mnt/c/Users/apsch/OneDrive/Documents/github/appscript-simcontrol-integration
   git status
   git add -A
   git commit -m "Pre-deployment checkpoint - all code ready for deployment"
   git tag -a "v2.0-pre-deployment" -m "Pre-deployment checkpoint"
   git push origin main --tags
   ```

### 1.2 Maintenance Window Communication

**Before starting deployment:**
- [ ] Notify users of maintenance window (suggest off-hours)
- [ ] Set calendar reminders
- [ ] Have rollback plan ready (see Phase 5)

### 1.3 Disable Existing Triggers

**Critical**: Disable all triggers **before** updating code to prevent old code from interfering.

For **each production sheet**:

1. Open Google Sheet → Extensions → Apps Script
2. Click Triggers (clock icon in left sidebar)
3. For each trigger:
   - Click ⋮ (three dots)
   - Click "Delete trigger"
   - Confirm deletion
4. Verify no triggers remain

**Alternatively**, add this function to legacy code and run once:

```javascript
function disableAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  SpreadsheetApp.getUi().alert('All triggers deleted: ' + triggers.length);
}
```

**Action Items:**
- [ ] account1-airtime: Disable all triggers
- [ ] account2-data: Disable all triggers
- [ ] wifi-gateway: Disable all triggers

---

## 🔧 Phase 2: Code Deployment

**Duration**: 5-10 minutes per deployment
**When**: Immediately after Phase 1

### 2.1 Verify .clasp.json Configuration

For each deployment, verify the `.clasp.json` has the correct Script ID from Phase 0 audit:

```bash
# Example for account1-airtime
cd /mnt/c/Users/apsch/OneDrive/Documents/github/appscript-simcontrol-integration/deployments/account1-airtime
cat .clasp.json
```

Expected format:
```json
{
  "scriptId": "1JarEOjTvpbzm7zRTXC_0AbgT8BwHo7EiMbTwyXIVbji1-pjm6-876NYo",
  "rootDir": "../../src"
}
```

**If Script ID is missing or incorrect**, update it now using the Script ID from Phase 0 audit.

### 2.2 Deploy New Code via CLASP

**For each deployment**, deploy the new codebase:

#### account1-airtime

```bash
cd /mnt/c/Users/apsch/OneDrive/Documents/github/appscript-simcontrol-integration/deployments/account1-airtime

# Verify you're authenticated
clasp login --status

# Push new code (this REPLACES all code in the script)
clasp push --force

# Verify deployment
clasp open
# Manually verify in browser that new files are present:
# - Config.gs
# - ApiClient.gs
# - Logger.gs
# - Menu.gs
# - etc. (should see ~22 files)
```

#### account2-data

```bash
cd /mnt/c/Users/apsch/OneDrive/Documents/github/appscript-simcontrol-integration/deployments/account2-data

clasp push --force
clasp open
# Verify in browser
```

#### wifi-gateway

```bash
cd /mnt/c/Users/apsch/OneDrive/Documents/github/appscript-simcontrol-integration/deployments/wifi-gateway

clasp push --force
clasp open
# Verify in browser
```

### 2.3 Verify Code Deployment

In the Apps Script editor for **each deployment**, verify:

- [ ] All new modules are present (~22 .gs files)
- [ ] Old legacy code is **replaced** (not present)
- [ ] `appsscript.json` manifest is updated
- [ ] No syntax errors shown (check for red underlines)

**If errors appear**, do NOT proceed to Phase 3. Investigate and fix first.

---

## ⚙️ Phase 3: Configure Script Properties

**Duration**: 5-10 minutes per deployment
**When**: Immediately after Phase 2

### 3.1 Review Configuration Files

For each deployment, review the `config.json` file to ensure it matches your production requirements:

```bash
# Review account1-airtime config
cat deployments/account1-airtime/config.json

# Review account2-data config
cat deployments/account2-data/config.json

# Review wifi-gateway config
cat deployments/wifi-gateway/config.json
```

**Update as needed**:
- Replace `"account1-api-key"` with actual SimControl API key
- Adjust start dates to match existing data
- Update excluded MSISDNs if applicable
- Adjust sheet names if they differ from defaults

### 3.2 Set Script Properties Manually

**For each deployment**, set script properties using the Apps Script UI:

1. **Open Apps Script Editor**
   - Google Sheet → Extensions → Apps Script

2. **Open Project Settings**
   - Click gear icon (⚙️) in left sidebar
   - Scroll to "Script Properties" section
   - Click "Edit script properties"

3. **Add Each Property from config.json**

**Example for account1-airtime:**

| Property | Value |
|----------|-------|
| `SIMCONTROL_API_KEY` | `your-actual-api-key-here` |
| `DEFAULT_START_DATE` | `2025-01-01` |
| `LOG_SHEET_NAME` | `[APP] Debug Log` |
| `ENABLE_AIRTIME` | `true` |
| `AIRTIME_SHEET_NAME` | `[API] Airtime Usage` |
| `AIRTIME_START_DATE` | `2025-01-01` |
| `AIRTIME_EXCLUDED_MSISDNS` | `["27123456789"]` |
| `ENABLE_DATA` | `false` |
| `ENABLE_RECHARGES` | `false` |
| `ENABLE_PRODUCTS` | `false` |
| `ENABLE_SIM_DETAILS` | `false` |
| `ENABLE_ANALYTICS` | `false` |
| `ENABLE_FOTAWEB` | `false` |
| `ENABLE_QRCODE` | `false` |

**Important Notes:**
- Use **exact** property names from config.json (case-sensitive)
- Boolean values must be strings: `"true"` or `"false"`
- Arrays must be JSON strings: `"[\"27123456789\"]"`
- Do NOT include spaces around `=` in property names

**Alternatively**, use CLASP to set properties (if configured):

```bash
# Install CLASP helper (if not already done)
npm install -g @google/clasp

# Set properties via command line
cd deployments/account1-airtime

# Set each property
clasp run setScriptProperty -p '["SIMCONTROL_API_KEY", "your-actual-key"]'
clasp run setScriptProperty -p '["ENABLE_AIRTIME", "true"]'
# ... repeat for all properties
```

### 3.3 Verify Script Properties

After setting all properties, verify they're correct:

1. **In Apps Script Editor:**
   - Project Settings → Script Properties
   - Verify all properties are listed
   - Check for typos in property names

2. **Run Configuration Test:**
   - In Apps Script editor, open `Tests.gs`
   - Select function: `testConfiguration`
   - Click "Run"
   - Check execution log (View → Logs)
   - Should see configuration loaded successfully

**Action Items:**
- [ ] account1-airtime: Script properties set and verified
- [ ] account2-data: Script properties set and verified
- [ ] wifi-gateway: Script properties set and verified

---

## ✅ Phase 4: Testing & Validation

**Duration**: 15-30 minutes per deployment
**When**: Immediately after Phase 3

### 4.1 Test Menu Appears

1. **Open the Google Sheet** (refresh the page)
2. Wait 5-10 seconds for the script to load
3. Look for **"SimControl Integration"** menu in the menu bar
4. Verify the menu has expected submenus based on configuration:
   - account1-airtime: Should see "📞 Airtime Usage" and "🔧 Utilities"
   - account2-data: Should see "📊 Data Usage", "📱 SIM Management", "🔧 Utilities"
   - wifi-gateway: Should see "📊 Data Usage", "📱 SIM Management", "🔧 Utilities"

**If menu doesn't appear:**
- Check browser console for JavaScript errors (F12 → Console)
- In Apps Script editor, check execution log for errors
- Verify `onOpen` function exists in `Menu.gs`
- Try: Extensions → Apps Script → Run → onOpen (manually trigger)

### 4.2 Run Full Test Suite

For **each deployment**:

1. **Navigate to Menu**
   - SimControl Integration → Utilities → Run Full Test Suite

2. **Review Test Results**
   - Should see dialog with test results
   - Verify "Module Integrity" test passes
   - Verify "Configuration" test passes
   - Verify "SimControl API Key" test passes (requires valid API key)
   - Check "[APP] Debug Log" sheet for detailed test logs

3. **Expected Results:**
   ```
   === TEST SUITE RESULTS ===

   Total Tests: 10-15
   ✅ Passed: 8-12
   ❌ Failed: 0
   ⚪ Skipped: 2-3

   All tests passed!
   ```

**If tests fail:**
- Check "[APP] Debug Log" sheet for error details
- Verify script properties are correct
- Verify API key is valid
- Check that sheet names match configuration

### 4.3 Test Core Function (Non-Destructive)

Test a **read-only** function first to verify API connectivity:

**For all deployments:**

1. **Menu → Utilities → Test SimControl API Key**
   - Should show "API connection successful"
   - If fails, check API key in script properties

2. **Menu → Utilities → Check API Rate Limit**
   - Should show current rate limit status
   - Verifies API is accessible

### 4.4 Test Data Fetch (Small Test)

**IMPORTANT**: Do NOT run full historical fetch yet. Test with small data first.

**For account1-airtime:**

1. **Menu → Airtime Usage → Fetch Previous Day Only**
2. Wait for completion
3. Verify:
   - [ ] No errors shown
   - [ ] Data appears in `[API] Airtime Usage` sheet
   - [ ] Column headers match expectations
   - [ ] Data values look correct (ZAR amounts)
   - [ ] Debug log shows successful fetch

**For account2-data:**

1. **Menu → Data Usage → Fetch Previous Day Only**
2. Verify similar to above (MB values instead of ZAR)

**For wifi-gateway:**

1. **Menu → Data Usage → Fetch Previous Day Only**
2. Verify similar to above

**If fetch fails:**
- Check Debug Log for errors
- Verify start date is not in the future
- Verify excluded MSISDNs format is correct
- Check rate limit status

### 4.5 Verify Sheet Compatibility

**Critical Check**: Ensure new code can read existing data:

1. **Open existing data sheet** (e.g., `[API] Airtime Usage`)
2. **Check column headers**:
   - First column should be "Date"
   - Subsequent columns should be MSISDNs or ICCIDs
3. **If headers are different**, update `config.json` or code as needed

**For legacy data preservation:**
- The new code appends data, so existing data remains untouched
- New code reads headers dynamically, so column order shouldn't matter
- If column headers are missing, new code will add them

### 4.6 Post-Deployment Validation Script

Add this validation script to each deployed sheet:

```javascript
/**
 * Run this AFTER deployment to validate everything works
 * Menu → Utilities → (add this as a menu item or run manually)
 */
function validateDeployment() {
  var report = [];
  report.push('=== POST-DEPLOYMENT VALIDATION ===');
  report.push('Date: ' + new Date().toISOString());

  try {
    // Test 1: Config loads
    var config = Config.get();
    report.push('✅ Config.get() - SUCCESS');

    // Test 2: API key exists
    var apiKey = Config.getApiKey('simcontrol');
    if (apiKey && apiKey !== 'account1-api-key') {
      report.push('✅ API Key configured - SUCCESS');
    } else {
      report.push('❌ API Key not set or still using placeholder');
    }

    // Test 3: Logger works
    Logger.log('Test log entry');
    report.push('✅ Logger.log() - SUCCESS');

    // Test 4: API client
    var balance = SimControlAPI.call('/organisations/balance', 'GET', null);
    if (balance) {
      report.push('✅ API connectivity - SUCCESS');
    } else {
      report.push('❌ API connectivity failed');
    }

    // Test 5: Sheets exist
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (config.integrations.airtime && config.integrations.airtime.enabled) {
      var airtimeSheet = ss.getSheetByName(config.integrations.airtime.sheetName);
      if (airtimeSheet) {
        report.push('✅ Airtime sheet exists - SUCCESS');
      } else {
        report.push('⚠️ Airtime sheet does not exist yet (will be created on first fetch)');
      }
    }

    if (config.integrations.data && config.integrations.data.enabled) {
      var dataSheet = ss.getSheetByName(config.integrations.data.sheetName);
      if (dataSheet) {
        report.push('✅ Data sheet exists - SUCCESS');
      } else {
        report.push('⚠️ Data sheet does not exist yet (will be created on first fetch)');
      }
    }

    report.push('');
    report.push('=== VALIDATION COMPLETE ===');

  } catch (e) {
    report.push('❌ ERROR: ' + e.message);
  }

  var reportText = report.join('\n');
  Logger.log(reportText);
  SpreadsheetApp.getUi().alert(reportText);

  return reportText;
}
```

**Run validation script for each deployment:**
- [ ] account1-airtime: Validation passed
- [ ] account2-data: Validation passed
- [ ] wifi-gateway: Validation passed

---

## 🔁 Phase 5: Re-enable Triggers

**Duration**: 5 minutes per deployment
**When**: After Phase 4 validation passes

### 5.1 Setup Daily Triggers

For **each deployment** that passed validation:

1. **Menu → Utilities → Setup Daily Triggers**
2. **Grant Permissions** (if prompted):
   - Click "Continue"
   - Select your Google account
   - Click "Advanced" → "Go to [project name] (unsafe)"
   - Click "Allow"
3. **Verify Triggers Created:**
   - Apps Script Editor → Triggers (clock icon)
   - Should see triggers for enabled integrations
   - Example for account1-airtime: `fetchPreviousDayAirtime` at 6:00 AM daily
   - Example for account2-data: `fetchPreviousDayData` at 7:00 AM daily

### 5.2 Verify Trigger Schedule

For each deployment, verify triggers are scheduled correctly:

| Deployment | Expected Triggers | Schedule |
|------------|-------------------|----------|
| account1-airtime | `fetchPreviousDayAirtime` | Daily at 6:00 AM |
| account2-data | `fetchPreviousDayData` | Daily at 7:00 AM |
| wifi-gateway | `fetchPreviousDayData` | Daily at 7:00 AM |

### 5.3 List Active Triggers

Verify triggers via menu:

1. **Menu → Utilities → List Active Triggers**
2. Check Debug Log for trigger list
3. Confirm expected triggers are present

**Action Items:**
- [ ] account1-airtime: Triggers enabled and verified
- [ ] account2-data: Triggers enabled and verified
- [ ] wifi-gateway: Triggers enabled and verified

---

## 📊 Phase 6: Monitor & Stabilize

**Duration**: 1-7 days
**When**: After deployment complete

### 6.1 First 24 Hours Monitoring

**Critical monitoring period** - watch for errors:

1. **Check Debug Log Daily:**
   - Menu → Utilities → View Debug Log
   - Look for errors (level = "ERROR")
   - Investigate any failures immediately

2. **Verify Triggers Execute:**
   - Apps Script Editor → Executions (left sidebar)
   - Check that daily triggers ran successfully
   - Look for any failed executions (red X)

3. **Verify Data Continues to Populate:**
   - Check data sheets daily
   - Ensure new rows are added
   - Compare with previous day to ensure continuity

4. **Check Rate Limiting:**
   - Menu → Utilities → Check API Rate Limit
   - Monitor remaining quota
   - Adjust fetch schedules if hitting limits

### 6.2 First Week Checklist

- [ ] Day 1: Verify triggers executed successfully
- [ ] Day 2: Check data continuity and accuracy
- [ ] Day 3: Review Debug Log for any warnings
- [ ] Day 4: Spot-check data values against API
- [ ] Day 5: Verify no user-reported issues
- [ ] Day 6: Check rate limit usage patterns
- [ ] Day 7: Final validation, consider deployment successful

### 6.3 User Communication

After 48 hours of stable operation:
- [ ] Notify users that migration is complete
- [ ] Provide quick start guide for new menu
- [ ] Share Debug Log location for troubleshooting
- [ ] Offer training session if needed

---

## 🚨 Phase 7: Rollback Procedures

**When**: If critical issues arise during/after deployment

### 7.1 Level 1: Configuration Rollback (Fastest)

**Time**: 2-5 minutes
**Use When**: New code deployed but not working due to config issues

1. **Fix Script Properties:**
   - Apps Script → Project Settings → Script Properties
   - Correct any typos or wrong values
   - Refresh Google Sheet

2. **Disable Problematic Integration:**
   - Set `ENABLE_[INTEGRATION]` to `"false"`
   - Refresh Google Sheet
   - Menu should update to hide integration

### 7.2 Level 2: Code Rollback (Medium)

**Time**: 5-10 minutes
**Use When**: New code has bugs or breaks existing functionality

**Restore from backup:**

1. **Open Backup Spreadsheet** (created in Phase 1.1)
2. **Copy Apps Script Code:**
   - Open backup sheet → Extensions → Apps Script
   - Select all code files
   - Copy each file
3. **Paste into Production:**
   - Open production sheet → Extensions → Apps Script
   - Delete new files
   - Paste old files back
4. **Restore Triggers:**
   - Recreate triggers manually as documented in Phase 0 audit

### 7.3 Level 3: Full Rollback (Slowest, Safest)

**Time**: 15-30 minutes
**Use When**: Critical data corruption or system failure

1. **Delete Current Spreadsheet** (or rename to "[BROKEN]")
2. **Restore Backup Spreadsheet:**
   - Make a copy of backup from Phase 1.1
   - Rename to original name
   - Share with same users
3. **Verify backup has all data**
4. **Notify users of new spreadsheet URL**

### 7.4 Emergency Contacts

Maintain a list of who to contact if issues arise:
- **Primary**: [Your Name] - [Your Email]
- **Secondary**: [Backup Person] - [Backup Email]
- **API Support**: SimControl Support - support@simcontrol.co.za

---

## 📝 Deployment Checklist Summary

### Pre-Deployment (Phase 0-1)
- [ ] Phase 0 audit completed for all deployments
- [ ] All backups created (spreadsheets, code, data, script properties)
- [ ] Git commit and tag created
- [ ] Maintenance window scheduled
- [ ] Existing triggers disabled

### Deployment (Phase 2-3)
- [ ] .clasp.json verified with correct Script IDs
- [ ] Code deployed via CLASP (all deployments)
- [ ] Deployment verified in Apps Script editor
- [ ] Script properties set (all deployments)
- [ ] Script properties verified

### Validation (Phase 4)
- [ ] Menu appears for all deployments
- [ ] Full test suite passes
- [ ] API connectivity test passes
- [ ] Small data fetch test passes
- [ ] Existing data compatibility verified
- [ ] Post-deployment validation script passes

### Go Live (Phase 5-6)
- [ ] Daily triggers re-enabled
- [ ] Trigger schedule verified
- [ ] 24-hour monitoring complete
- [ ] 7-day monitoring complete
- [ ] Users notified

### Rollback Ready
- [ ] Rollback procedures documented and understood
- [ ] Backup locations known
- [ ] Emergency contacts listed

---

## 🎯 Success Criteria

Deployment is considered successful when:

1. ✅ All three deployments completed without errors
2. ✅ Menus appear and function correctly
3. ✅ Test suite passes for all deployments
4. ✅ Data fetches work and populate sheets
5. ✅ Existing data preserved and accessible
6. ✅ Daily triggers execute successfully for 7 days
7. ✅ No critical errors in Debug Log
8. ✅ Users can access and use new system
9. ✅ Rollback procedures documented and tested

---

## 📚 Reference Documents

- **DEPLOYMENT.md** - General deployment guide
- **MIGRATION.md** - Migration strategy and procedures
- **TESTING.md** - Testing procedures and validation
- **README.md** - Project overview
- **spec.md** - System architecture

---

**End of Deployment Orchestration Plan**

**Next Steps**: Begin Phase 0 audit and work through each phase sequentially.
