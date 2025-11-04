# Production Sheets Mapping

**Last Updated**: 2025-11-04

This document maps production Google Sheets to their deployment configurations and Script IDs.

---

## Production Sheets

### 1. 3BO SIM Data

- **Google Sheet URL**: https://docs.google.com/spreadsheets/d/12dQEC7_4mHlABh8z6EWRR0NBMfVnF9lrTtSS2Kd2bpQ/edit
- **Deployment**: `deployments/account1-airtime/`
- **Script ID**: `1JarEOjTvpbzm7zRTXC_0AbgT8BwHo7EiMbTwyXIVbji1-pjm6-876NYo`
- **Configuration**: Airtime tracking only
- **Enabled Integrations**:
  - ✅ Airtime Usage
  - ❌ Data Usage
  - ❌ Recharges
  - ❌ Products
  - ❌ SIM Details
  - ❌ Analytics
  - ❌ FOTA Web
  - ❌ QR Code

**Expected Menu Items**:
- 📞 Airtime Usage
- 📱 SIM Management
- 🔧 Utilities

---

### 2. Plentify SimControl Data

- **Google Sheet URL**: https://docs.google.com/spreadsheets/d/1meXfID-9PpephNdsWH4YJISwtRGpbMxbVG-HG7-BdsA/edit
- **Deployment**: `deployments/account2-data/`
- **Script ID**: `1IpH1MqDaA-tcuNyCRc8rTVGCVqdpMsHFNhPBnTJSft6PjvHZjriupcsF`
- **Configuration**: Full data management with analytics
- **Enabled Integrations**:
  - ❌ Airtime Usage
  - ✅ Data Usage
  - ✅ Recharges
  - ✅ Products
  - ❌ SIM Details
  - ✅ Analytics (High Usage Filter only)
  - ❌ FOTA Web
  - ❌ QR Code

**Expected Menu Items**:
- 📊 Data Usage (includes Recharges, Products, High Usage)
- 📱 SIM Management
- 🔧 Utilities

---

### 3. Wifi Gateways Provisioning

- **Google Sheet URL**: https://docs.google.com/spreadsheets/d/1mmV-zin6JeFy9yrCEAcj64uxsRSX8NResuojH5oFkuk/edit
- **Deployment**: `deployments/wifi-gateway/`
- **Script ID**: `1rk7tz-RQA56oE-wOB7zE6DP4YkzIu39DirEPAnO17QgM-nyXt91413k6`
- **Configuration**: SIM management focus with usage age analysis
- **Enabled Integrations**:
  - ❌ Airtime Usage
  - ✅ Data Usage
  - ❌ Recharges
  - ✅ Products
  - ✅ SIM Details
  - ✅ Analytics (Usage Age Analysis only)
  - ❌ FOTA Web
  - ❌ QR Code

**Expected Menu Items**:
- 📊 Data Usage
- 📱 SIM Management (includes SIM Details, Usage Age Analysis)
- 🔧 Utilities

---

## Deployment Status

| Sheet | Script ID Configured | Config File Ready | Status |
|-------|---------------------|-------------------|--------|
| 3BO SIM Data | ✅ Yes | ✅ Yes | Ready for deployment |
| Plentify SimControl Data | ✅ Yes | ✅ Yes | Ready for deployment |
| Wifi Gateways Provisioning | ✅ Yes | ✅ Yes | Ready for deployment |

---

## Recommended Deployment Order

Follow this order to minimize risk:

### 1. Wifi Gateways Provisioning (Deploy First)
- **Why**: Test bed for multi-integration features
- **Risk Level**: Low (non-critical timing)
- **Monitoring**: 24-48 hours before next deployment

### 2. 3BO SIM Data (Deploy Second)
- **Why**: Simplest configuration (single integration)
- **Risk Level**: Low (easy to validate)
- **Monitoring**: 24-48 hours before next deployment

### 3. Plentify SimControl Data (Deploy Last)
- **Why**: Most complex (multiple integrations)
- **Risk Level**: Medium (learn from previous two)
- **Monitoring**: 7 days

---

## Pre-Deployment Checklist

Before deploying to any sheet:

### For Each Sheet:

1. **Run Pre-Deployment Audit Script**
   - See DEPLOYMENT_ORCHESTRATION.md Phase 0.2
   - Paste audit script into current Apps Script
   - Run once to document current state
   - Save output to `[AUDIT] Pre-Deployment` sheet

2. **Backup Everything**
   - File → Make a copy → `[BACKUP] [Sheet Name] - 2025-11-04`
   - Export data to CSV for critical sheets
   - Screenshot current triggers
   - Export script properties

3. **Verify .clasp.json**
   - Script ID matches this document ✅
   - rootDir is `../../src` ✅

4. **Review config.json**
   - API key placeholder will be replaced with actual key
   - Start dates are correct
   - Sheet names match existing sheets
   - Integration flags are correct

5. **Disable Existing Triggers**
   - Apps Script → Triggers → Delete all
   - **CRITICAL**: Must do this before code deployment

---

## Script Properties Requirements

### All Sheets Require:
```
SIMCONTROL_API_KEY = "your-actual-api-key-here"
DEFAULT_START_DATE = "YYYY-MM-DD"
LOG_SHEET_NAME = "[APP] Debug Log"
```

### Sheet-Specific Properties:

See `deployments/[deployment-name]/config.json` for complete property lists.

---

## Post-Deployment Validation

After deploying to each sheet:

### Immediate Checks (Phase 4):
- [ ] Menu appears: "SimControl Integration"
- [ ] Menu has expected submenus (see above)
- [ ] Run Full Test Suite (Menu → Utilities)
- [ ] All tests pass ✅
- [ ] API connection works
- [ ] Small data fetch works (previous day only)
- [ ] No errors in `[APP] Debug Log`

### Daily Checks (Days 1-7):
- [ ] Triggers executed successfully
- [ ] Data continues to populate
- [ ] No errors in Debug Log
- [ ] No user-reported issues

---

## Rollback Information

If issues arise during deployment:

**Level 1 - Config Rollback** (2-5 min):
- Fix script properties
- Refresh sheet

**Level 2 - Code Rollback** (5-10 min):
- Restore code from backup
- Recreate triggers

**Level 3 - Full Rollback** (15-30 min):
- Restore backup spreadsheet
- Verify data intact

See DEPLOYMENT_ORCHESTRATION.md Phase 7 for detailed procedures.

---

## Support & Documentation

**Primary Deployment Guide**: DEPLOYMENT_ORCHESTRATION.md
**Quick Reference**: DEPLOYMENT_QUICKSTART.md
**Troubleshooting**: Check `[APP] Debug Log` sheet first

---

**Last Verified**: 2025-11-04
**Next Review**: After production deployment complete
