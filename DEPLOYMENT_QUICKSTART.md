# Deployment Quick Start Guide

**For**: Production deployment to existing Google Sheets
**Time**: ~1 hour per deployment
**Risk Level**: Medium (requires backups and careful execution)

---

## ⚡ Quick Reference Card

### Before You Start
- [ ] Read DEPLOYMENT_ORCHESTRATION.md fully
- [ ] Schedule maintenance window (off-hours recommended)
- [ ] Have rollback plan ready
- [ ] Notify users of maintenance

### Required Tools
- [ ] Google Account access to production sheets
- [ ] CLASP installed (`npm install -g @google/clasp`)
- [ ] Git access to repository
- [ ] SimControl API key(s)

---

## 🎯 The 7-Phase Process

### Phase 0: Audit (30 min)
```bash
# For each production sheet:
1. Document Script ID (Extensions → Apps Script → URL)
2. Run audit script (see DEPLOYMENT_ORCHESTRATION.md Phase 0.2)
3. Export current code (Download as ZIP)
4. Export data (File → Download → CSV)
5. Screenshot triggers
6. Copy script properties
```

**Output**: Audit report for each deployment

---

### Phase 1: Backup (15 min)
```bash
# For each production sheet:
1. File → Make a copy → Name: "[BACKUP] [Name] - 2025-11-04"
2. git commit -m "Pre-deployment checkpoint"
3. git tag v2.0-pre-deployment
4. Disable all triggers (Triggers → Delete)
```

**Critical**: Do NOT skip backup step!

---

### Phase 2: Deploy Code (10 min)
```bash
# Update .clasp.json with real Script IDs from Phase 0
cd deployments/account1-airtime
# Edit .clasp.json: "scriptId": "REAL_SCRIPT_ID_HERE"

# Push code
clasp push --force

# Verify
clasp open
# Should see ~22 new .gs files in Apps Script editor
```

**Repeat for**: account2-data, wifi-gateway

---

### Phase 3: Configure (15 min)
```bash
# For each deployment:
1. Apps Script → Project Settings → Script Properties
2. Add each property from config.json
3. Use EXACT property names (case-sensitive)
4. Boolean values as strings: "true" or "false"
5. Arrays as JSON strings: "[\"value\"]"
```

**Quick check**:
```
SIMCONTROL_API_KEY = your-actual-api-key
ENABLE_AIRTIME = "true"  (or "false")
ENABLE_DATA = "true"  (or "false")
... etc
```

---

### Phase 4: Test (20 min)
```bash
# For each deployment:
1. Refresh Google Sheet (wait 10 sec for menu)
2. Menu → Utilities → Run Full Test Suite
3. Verify: All tests pass ✅
4. Menu → Airtime/Data Usage → Fetch Previous Day Only
5. Check data appears correctly
6. Check [APP] Debug Log for errors
```

**If tests fail**: Do NOT proceed. Check Debug Log and fix issues.

---

### Phase 5: Go Live (5 min)
```bash
# For each deployment:
1. Menu → Utilities → Setup Daily Triggers
2. Grant permissions when prompted
3. Verify triggers: Apps Script → Triggers
4. Expected: fetchPreviousDayAirtime (or Data) at 6-7 AM
```

---

### Phase 6: Monitor (7 days)
```bash
Day 1-7: Check daily
- Menu → Utilities → View Debug Log
- Look for errors
- Verify triggers execute (Apps Script → Executions)
- Verify data continues to populate
```

---

### Phase 7: Celebrate 🎉
After 7 days of stable operation:
- [ ] Notify users migration complete
- [ ] Archive old backups
- [ ] Document lessons learned

---

## 🚨 If Something Goes Wrong

### Quick Rollback (5 min)
```bash
# Option A: Fix config
Apps Script → Project Settings → Script Properties
# Fix the wrong value, refresh sheet

# Option B: Restore code
1. Open backup spreadsheet from Phase 1
2. Extensions → Apps Script
3. Copy all code files
4. Paste into production Apps Script
5. Recreate triggers manually
```

### Full Rollback (30 min)
```bash
1. Rename current sheet: "[BROKEN] Original Name"
2. Make copy of backup from Phase 1
3. Rename copy to original name
4. Share with users
5. Verify data intact
```

---

## 📋 Deployment Order Recommendation

Deploy in this order for risk management:

1. **Start with**: `wifi-gateway` (lowest complexity)
   - Has data + products + SIM details + analytics
   - Good test of multiple integrations
   - Non-critical timing (can deploy anytime)

2. **Next**: `account1-airtime` (single integration)
   - Simplest configuration
   - Easy to validate
   - Less risk

3. **Last**: `account2-data` (most complex)
   - Has all integrations enabled
   - Deploy after learning from previous two
   - Monitor closely

**Wait 24-48 hours between deployments** to ensure stability.

---

## ⚙️ Script Properties Quick Reference

### account1-airtime (Minimal)
```
SIMCONTROL_API_KEY = "your-api-key"
DEFAULT_START_DATE = "2025-01-01"
LOG_SHEET_NAME = "[APP] Debug Log"
ENABLE_AIRTIME = "true"
AIRTIME_SHEET_NAME = "[API] Airtime Usage"
AIRTIME_START_DATE = "2025-01-01"
AIRTIME_EXCLUDED_MSISDNS = "[]"
ENABLE_DATA = "false"
ENABLE_RECHARGES = "false"
ENABLE_PRODUCTS = "false"
ENABLE_SIM_DETAILS = "false"
ENABLE_ANALYTICS = "false"
ENABLE_FOTAWEB = "false"
ENABLE_QRCODE = "false"
```

### account2-data (Full featured)
```
SIMCONTROL_API_KEY = "your-api-key"
DEFAULT_START_DATE = "2025-01-01"
LOG_SHEET_NAME = "[APP] Debug Log"
ENABLE_AIRTIME = "false"
ENABLE_DATA = "true"
DATA_SHEET_NAME = "[API] Data Usage"
DATA_START_DATE = "2025-08-26"
DATA_EXCLUDED_MSISDNS = "[]"
ENABLE_RECHARGES = "true"
RECHARGE_SHEET_NAME = "[API] Recharges"
ENABLE_PRODUCTS = "true"
PRODUCTS_SHEET_NAME = "[API] Recharge Product IDs"
PRODUCTS_NETWORK_IDS = "[10, 11]"
PRODUCTS_TYPE = "DATA"
ENABLE_SIM_DETAILS = "false"
ENABLE_ANALYTICS = "true"
ANALYTICS_USAGE_AGE_ENABLED = "false"
ANALYTICS_HIGH_USAGE_ENABLED = "true"
ANALYTICS_HIGH_USAGE_SHEET = "[APP] High Usage"
ANALYTICS_HIGH_USAGE_THRESHOLD = "1500"
ENABLE_FOTAWEB = "false"
ENABLE_QRCODE = "false"
```

### wifi-gateway (SIM management focus)
```
SIMCONTROL_API_KEY = "your-api-key"
DEFAULT_START_DATE = "2025-06-01"
LOG_SHEET_NAME = "[APP] Debug Log"
ENABLE_AIRTIME = "false"
ENABLE_DATA = "true"
DATA_SHEET_NAME = "[API] Data Usage"
DATA_START_DATE = "2025-06-01"
DATA_EXCLUDED_MSISDNS = "[]"
ENABLE_RECHARGES = "false"
ENABLE_PRODUCTS = "true"
PRODUCTS_SHEET_NAME = "[API] Recharge Product IDs"
PRODUCTS_NETWORK_IDS = "[10, 11]"
PRODUCTS_TYPE = "DATA"
ENABLE_SIM_DETAILS = "true"
SIM_DETAILS_SHEET_NAME = "[API] SimControl Data"
ENABLE_ANALYTICS = "true"
ANALYTICS_USAGE_AGE_ENABLED = "true"
ANALYTICS_USAGE_AGE_SHEET = "[APP] Usage Age Analysis"
ANALYTICS_HIGH_USAGE_ENABLED = "false"
ENABLE_FOTAWEB = "false"
ENABLE_QRCODE = "false"
```

---

## 🎯 Success Checklist

After deployment, verify:
- [ ] ✅ Menu appears with expected submenus
- [ ] ✅ Test suite passes (all green)
- [ ] ✅ API connection works
- [ ] ✅ Data fetch populates sheet
- [ ] ✅ Existing data preserved
- [ ] ✅ Triggers scheduled correctly
- [ ] ✅ No errors in Debug Log
- [ ] ✅ Users can access system

---

## 📞 Support

**Before asking for help:**
1. Check `[APP] Debug Log` sheet for error details
2. Review DEPLOYMENT_ORCHESTRATION.md for detailed steps
3. Try validation script from Phase 4.6

**Common Issues:**
- **Menu doesn't appear**: Wait 10 seconds, refresh page, or run `onOpen` manually
- **API connection fails**: Check `SIMCONTROL_API_KEY` property
- **Tests fail**: Check script properties are exact match (case-sensitive)
- **Trigger permission denied**: Menu → Utilities → Grant Trigger Permissions

---

## 📚 Related Documents

- **DEPLOYMENT_ORCHESTRATION.md** - Detailed phase-by-phase guide (read this first!)
- **DEPLOYMENT.md** - General deployment procedures
- **MIGRATION.md** - Migration strategy and user training
- **TESTING.md** - Testing procedures and validation
- **README.md** - Project overview

---

**Ready to deploy?**

1. Read DEPLOYMENT_ORCHESTRATION.md completely
2. Schedule maintenance window
3. Start with Phase 0 audit
4. Work through phases sequentially
5. Don't skip validation steps!

**Good luck! 🚀**
