# Deployment Guide

**Project**: Google Apps Script Multi-Integration System
**Version**: 2.0
**Last Updated**: 2025-11-06

This guide covers deploying the SimControl Integration system to Google Apps Script using CLASP and GitHub Actions.

---

## 🚀 Automated Deployment (Recommended)

**This project has automated deployment via GitHub Actions!**

When you push changes to the `main` branch, the code automatically deploys to all 3 production Google Sheets:
- 3BO SIM Data
- Plentify SimControl Data
- WiFi Gateways Provisioning

**👉 For automated deployment setup, see: [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)**

This guide below covers **manual deployment** using CLASP for local development or troubleshooting.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Deployment with CLASP](#local-deployment-with-clasp)
3. [GitHub Actions CI/CD](#github-actions-cicd)
4. [Multi-Account Deployment](#multi-account-deployment)
5. [Configuration Management](#configuration-management)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

1. **Node.js** (v18 or later)
   ```bash
   node --version
   ```

2. **CLASP** (Command Line Apps Script Projects)
   ```bash
   npm install -g @google/clasp
   ```

3. **Google Account** with Apps Script API enabled
   - Go to: https://script.google.com/home/usersettings
   - Enable "Google Apps Script API"

### Required Permissions

- Google Sheets API access
- Google Drive API access (for QR code storage)
- Apps Script execution permissions

---

## Local Deployment with CLASP

### 1. Initial Setup

**Authenticate with Google:**
```bash
clasp login
```

This opens a browser window for Google authentication and creates `~/.clasprc.json` with your credentials.

**Verify authentication:**
```bash
clasp list
```

### 2. Deploy to Specific Account

Navigate to the deployment directory for your target account:

```bash
# Example: Deploy to Account 1 (Airtime tracking)
cd deployments/account1-airtime

# Push code to Apps Script
clasp push --force
```

The `.clasp.json` file in each deployment directory contains the script ID and points to `../../src`.

### 3. Available Deployments

| Directory | Purpose | Enabled Integrations |
|-----------|---------|---------------------|
| `account1-airtime` | Airtime usage tracking | Airtime only |
| `account2-data` | Data usage tracking | Data, Recharges, Products, Analytics |
| `wifi-gateway` | Full featured gateway | All integrations enabled |

### 4. Manual Deployment Steps

```bash
# 1. Navigate to project root
cd /path/to/appscript-simcontrol-integration

# 2. Choose deployment target
cd deployments/account1-airtime

# 3. Deploy
clasp push --force

# 4. Open in Apps Script editor (optional)
clasp open
```

---

## GitHub Actions CI/CD

### 1. Repository Secrets Setup

Go to your GitHub repository → Settings → Secrets and variables → Actions

**Required Secrets:**

1. **CLASPRC_ACCOUNT1** - Base64 encoded `.clasprc.json` for Account 1
2. **SCRIPT_ID_ACCOUNT1** - Apps Script project ID for Account 1
3. **CLASPRC_ACCOUNT2** - Base64 encoded `.clasprc.json` for Account 2
4. **SCRIPT_ID_ACCOUNT2** - Apps Script project ID for Account 2

### 2. Obtaining Secrets

#### Get `.clasprc.json`:

```bash
# After running 'clasp login', encode the file
cat ~/.clasprc.json | base64
```

Copy the output and add it as a GitHub secret.

#### Get Script ID:

**Method 1: From Apps Script Editor**
- Open your Google Sheet
- Extensions → Apps Script
- Project Settings → Script ID

**Method 2: From `.clasp.json`**
```bash
cat deployments/account1-airtime/.clasp.json
# Look for "scriptId"
```

### 3. Deployment Workflows

Two workflows are configured:

#### **deploy-account1.yml**
- **Trigger**: Manual (`workflow_dispatch`) or push to `main` branch
- **Target**: Account 1 (Airtime tracking)
- **Uses**: `CLASPRC_ACCOUNT1` and `SCRIPT_ID_ACCOUNT1`

#### **deploy-account2.yml**
- **Trigger**: Manual or push to `main` (only when `src/**` changes)
- **Target**: Account 2 (Data tracking)
- **Uses**: `CLASPRC_ACCOUNT2` and `SCRIPT_ID_ACCOUNT2`

### 4. Manual Workflow Dispatch

**Via GitHub UI:**
1. Go to Actions tab
2. Select workflow (Deploy to Google Account 1 or 2)
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

**Via GitHub CLI:**
```bash
# Deploy to Account 1
gh workflow run "Deploy to Google Account 1"

# Deploy to Account 2
gh workflow run "Deploy to Google Account 2"
```

### 5. Automatic Deployment

Both workflows automatically deploy on push to `main`:

```bash
git add .
git commit -m "Update SimControl integration"
git push origin main
```

- Account 1 deploys on **any** push to main
- Account 2 deploys only when **src/ files** change

---

## Multi-Account Deployment

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         GitHub Repository (main)            │
│  ┌────────────────────────────────────┐    │
│  │         src/ (Source Code)         │    │
│  └────────────┬───────────────────────┘    │
│               │                             │
│  ┌────────────┴───────────────────────┐    │
│  │    deployments/ (Configurations)   │    │
│  │  • account1-airtime/              │    │
│  │  • account2-data/                 │    │
│  │  • wifi-gateway/                  │    │
│  └────────────┬───────────────────────┘    │
└───────────────┼─────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
  ┌─────▼─────┐    ┌────▼──────┐
  │ Account 1 │    │ Account 2 │
  │  Sheet    │    │  Sheet    │
  └───────────┘    └───────────┘
```

### Configuration Per Account

Each deployment directory has:

1. **`.clasp.json`** - Links to source code and specifies script ID
2. **`config.json`** - Environment-specific configuration

**Example: `deployments/account1-airtime/config.json`**
```json
{
  "scriptProperties": {
    "SIMCONTROL_API_KEY": "your-api-key-here",
    "ENABLE_AIRTIME": "true",
    "ENABLE_DATA": "false",
    "AIRTIME_SHEET_NAME": "[API] Airtime Usage"
  }
}
```

---

## Configuration Management

### Script Properties

Configuration is stored as Apps Script properties. These are NOT in version control for security.

#### Set Properties Manually:

**Via Apps Script Editor:**
1. Open Apps Script project
2. Project Settings → Script Properties
3. Add properties:
   - `SIMCONTROL_API_KEY`
   - `ENABLE_AIRTIME` = `true`
   - `AIRTIME_SHEET_NAME` = `[API] Airtime Usage`
   - etc.

**Via CLASP:**
```bash
# Not directly supported, use editor or custom script
```

#### Configuration Template

See `deployments/*/config.json` for full configuration templates.

**Core Properties:**
- `SIMCONTROL_API_KEY` - **Required** - SimControl API key
- `DEFAULT_START_DATE` - Default start date for data fetching
- `LOG_SHEET_NAME` - Debug log sheet name

**Integration Toggles:**
- `ENABLE_AIRTIME` - Enable airtime tracking
- `ENABLE_DATA` - Enable data tracking
- `ENABLE_RECHARGES` - Enable recharge tracking
- `ENABLE_PRODUCTS` - Enable product catalog
- `ENABLE_SIM_DETAILS` - Enable SIM details export
- `ENABLE_ANALYTICS` - Enable analytics features
- `ENABLE_FOTAWEB` - Enable FOTA Web integration
- `ENABLE_QRCODE` - Enable QR code generation

**Per-Integration Settings:**
Each integration has specific properties (sheet names, start dates, exclusions, etc.)

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Error:** `User has not enabled the Google Apps Script API`

**Solution:**
- Go to https://script.google.com/home/usersettings
- Enable "Google Apps Script API"
- Re-run `clasp login`

---

#### 2. Push Fails with "scriptId not found"

**Error:** `Script not found: <scriptId>`

**Solution:**
- Verify script ID in `.clasp.json`
- Ensure you have access to the script
- Check authentication: `clasp list`

---

#### 3. GitHub Actions Fails

**Error:** `clasp push failed`

**Possible Causes:**
1. Invalid `CLASPRC` secret
2. Invalid `SCRIPT_ID` secret
3. Script ID doesn't match account credentials

**Solution:**
- Re-encode `.clasprc.json`: `cat ~/.clasprc.json | base64`
- Update GitHub secret
- Verify script ID matches the account in `.clasprc.json`

---

#### 4. Configuration Not Loading

**Error:** `Config.getApiKey() returns null`

**Solution:**
- Verify Script Properties are set in Apps Script editor
- Check property name spelling: `SIMCONTROL_API_KEY`
- Ensure properties are set for the correct script project

---

#### 5. Deployment to Wrong Account

**Symptom:** Code deploys but to wrong Google Sheet

**Solution:**
- Check script ID in `.clasp.json`
- Verify you're in correct deployment directory
- Ensure GitHub Action uses correct secrets

---

### Verification Steps

After deployment, verify:

1. **Code Deployed:**
   - Open Apps Script editor
   - Check all `.gs` files are present
   - Verify code matches repository

2. **Configuration Loaded:**
   - Open Google Sheet
   - Check menu: "SimControl Integration"
   - Click Utilities → View Configuration
   - Verify enabled integrations match expectations

3. **API Access:**
   - Click Utilities → Test SimControl API Key
   - Should show "✅ API key is valid"

4. **Permissions:**
   - First run will prompt for permissions
   - Review and accept required scopes

---

## Security Best Practices

### 1. API Keys

- **NEVER** commit API keys to repository
- Store in Script Properties only
- Use different API keys per deployment if possible
- Rotate keys periodically

### 2. GitHub Secrets

- Use base64 encoding for `.clasprc.json`
- Limit access to repository secrets
- Use environment-specific secrets (Account1, Account2, etc.)

### 3. Access Control

- Limit Google Sheet sharing
- Use service accounts for production if available
- Review Apps Script authorized users regularly

---

## Next Steps

After successful deployment:

1. **Set Up Triggers** - Use Menu → Utilities → Setup Daily Triggers
2. **Test Integration** - Run Menu → Utilities → Test SimControl API Key
3. **Fetch Initial Data** - Menu → Data Usage → Download All Historical Data
4. **Monitor Logs** - Menu → Utilities → View Debug Log

---

## Support

For issues:
1. Check debug log in Google Sheet
2. Review GitHub Actions workflow logs
3. Consult API documentation in `simcontrol-api-docs.json`
4. Create GitHub issue with error details

---

**Deployment complete! 🚀**
