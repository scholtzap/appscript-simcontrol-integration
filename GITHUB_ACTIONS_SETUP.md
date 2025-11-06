# GitHub Actions Automated Deployment Setup

This document explains how the automated deployment system works and how to set it up from scratch.

## Overview

The project uses **GitHub Actions** to automatically deploy code changes to Google Apps Script whenever changes are pushed to the `main` branch.

There are **3 separate workflows**, one for each Google Sheet:
1. **Deploy to 3BO SIM Data** (`deploy-3bo-sim-data.yml`)
2. **Deploy to Plentify SimControl Data** (`deploy-plentify-simcontrol-data.yml`)
3. **Deploy to WiFi Gateways Provisioning** (`deploy-wifi-gateways-provisioning.yml`)

---

## How It Works

### Trigger Conditions

Each workflow automatically runs when:
- Code is pushed to the `main` branch
- Changes are made to files in the `src/**` directory
- Manually triggered via GitHub Actions UI (workflow_dispatch)

### Deployment Process

1. **Checkout code** from the repository
2. **Install Node.js** and **clasp** CLI tool
3. **Decode authentication credentials** from GitHub secrets
4. **Deploy to Google Apps Script** using `clasp push --force` from the appropriate deployment directory

---

## File Structure

### Workflow Files

Located in `.github/workflows/`:

```
.github/workflows/
├── deploy-3bo-sim-data.yml
├── deploy-plentify-simcontrol-data.yml
└── deploy-wifi-gateways-provisioning.yml
```

### Deployment Directories

Each sheet has its own deployment directory with a `.clasp.json` configuration:

```
deployments/
├── account1-airtime/
│   ├── .clasp.json          # Contains Script ID for 3BO SIM Data sheet
│   └── config.json          # Sheet-specific configuration
├── account2-data/
│   ├── .clasp.json          # Contains Script ID for Plentify sheet
│   └── config.json
└── wifi-gateway/
    ├── .clasp.json          # Contains Script ID for WiFi Gateways sheet
    └── config.json
```

### Source Code

All sheets deploy from the shared `src/` directory:

```
src/
├── ApiClient.gs
├── Config.gs
├── Logger.gs
├── SimControlUsage.gs
└── ... (20 total files)
```

---

## Required GitHub Secrets

Each workflow requires a **GitHub Secret** containing base64-encoded clasp authentication.

| Secret Name | Used By Workflow | Purpose |
|-------------|------------------|---------|
| `CLASPRC_3BO_SIM_DATA` | deploy-3bo-sim-data.yml | Auth for 3BO SIM Data sheet |
| `CLASPRC_PLENTIFY_SIMCONTROL_DATA` | deploy-plentify-simcontrol-data.yml | Auth for Plentify sheet |
| `CLASPRC_WIFI_GATEWAYS_PROVISIONING` | deploy-wifi-gateways-provisioning.yml | Auth for WiFi Gateways sheet |

---

## Setting Up GitHub Secrets

### Step 1: Obtain Fresh Clasp Authentication

On your **local machine** where you have clasp working:

**PowerShell (Windows):**
```powershell
# Navigate to project directory
cd C:\Users\[YourUsername]\OneDrive\Documents\github\appscript-simcontrol-integration

# Logout and re-login to get fresh credentials
clasp logout
clasp login

# This opens a browser - select your Google account and grant permissions
# After success, .clasprc.json is created in your home directory
```

### Step 2: Encode .clasprc.json to Base64

**PowerShell:**
```powershell
# Read and encode the file
$clasprcContent = Get-Content "$HOME\.clasprc.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($clasprcContent)
$base64 = [Convert]::ToBase64String($bytes)

# Display the base64 string (copy this!)
$base64
```

**Linux/WSL:**
```bash
base64 -w 0 ~/.clasprc.json
```

### Step 3: Add Secrets to GitHub

1. Go to your repository: https://github.com/scholtzap/appscript-simcontrol-integration

2. Click **Settings** → **Secrets and variables** → **Actions**

3. Click **"New repository secret"**

4. Add each secret:
   - **Name:** `CLASPRC_3BO_SIM_DATA`
   - **Value:** Paste the base64 string from Step 2
   - Click **"Add secret"**

5. Repeat for the other two secrets:
   - `CLASPRC_PLENTIFY_SIMCONTROL_DATA`
   - `CLASPRC_WIFI_GATEWAYS_PROVISIONING`

**Note:** If all three sheets use the **same Google account**, you can use the **same base64 string** for all three secrets.

---

## .clasprc.json Structure

### Expected Structure (Created by `clasp login`)

```json
{
  "tokens": {
    "default": {
      "client_id": "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com",
      "client_secret": "v6V3fKV_zWU7iw1DrpO1rknX",
      "type": "authorized_user",
      "refresh_token": "1//03Nzy6QwyzGkTCgYIARAAGAMSNwF...",
      "access_token": "ya29.a0ATi6K2uwjrynFuaAkBhKVDVtP0OLNyUBhbK..."
    }
  }
}
```

### Important Notes

1. **Keep the nested structure** - The workflows expect `tokens.default.*` structure
2. **Don't modify the JSON** - Use the exact output from `clasp login`
3. **Include the = padding** - Base64 strings ending in `=` or `==` are correct
4. **Refresh tokens don't expire** - You only need to update secrets if you revoke access

---

## How the Workflow Uses Credentials

### Decoding Process

```yaml
- name: Set up authentication
  run: |
    # Decode base64 secret to ~/.clasprc.json
    echo "${{ secrets.CLASPRC_WIFI_GATEWAYS_PROVISIONING }}" | base64 --decode > ~/.clasprc.json
    chmod 600 ~/.clasprc.json
```

### Deployment Process

```yaml
- name: Deploy to WiFi Gateways Provisioning (Google Apps Script)
  working-directory: deployments/wifi-gateway
  run: |
    clasp push --force
```

The `working-directory` is critical because:
- It contains the `.clasp.json` with the Script ID
- Clasp reads this to know which Apps Script project to update
- The `rootDir: "../../src"` in `.clasp.json` points to the shared source code

---

## Workflow File Structure

### Example: deploy-wifi-gateways-provisioning.yml

```yaml
name: Deploy to WiFi Gateways Provisioning

on:
  workflow_dispatch:  # Manual trigger
  push:
    branches:
      - main
    paths:
      - 'src/**'  # Only trigger on source code changes

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install clasp
        run: npm install -g @google/clasp

      - name: Set up authentication
        run: |
          echo "${{ secrets.CLASPRC_WIFI_GATEWAYS_PROVISIONING }}" | base64 --decode > ~/.clasprc.json
          chmod 600 ~/.clasprc.json

      - name: Deploy to WiFi Gateways Provisioning (Google Apps Script)
        working-directory: deployments/wifi-gateway
        run: |
          clasp push --force
```

---

## Troubleshooting

### "No access, refresh token" Error

**Cause:** The `.clasprc.json` structure is incorrect or credentials are invalid.

**Solution:**
1. Run `clasp logout` then `clasp login` locally
2. Re-encode the new `.clasprc.json` file
3. Update the GitHub secret with the new base64 string

### "Cannot read properties of undefined (reading 'access_token')" Error

**Cause:** The JSON structure doesn't match what clasp expects.

**Solution:**
- Verify the decoded JSON has the `tokens.default.*` structure
- Don't transform or flatten the JSON structure
- Use the exact output from `clasp login`

### Workflow Doesn't Trigger

**Cause:** No changes to `src/**` files.

**Solution:**
- Manually trigger via Actions tab → Select workflow → "Run workflow"
- Or make a change to any file in the `src/` directory

### Wrong Script ID

**Cause:** The `.clasp.json` in the deployment directory has the wrong Script ID.

**Solution:**
- Check the Script ID in the Google Apps Script editor (File → Project properties)
- Update `deployments/[sheet-name]/.clasp.json` with the correct ID

---

## Manual Deployment (Fallback)

If GitHub Actions fails, you can always deploy manually:

```bash
# Navigate to a deployment directory
cd deployments/wifi-gateway

# Push to Google Apps Script
clasp push --force
```

This uses your local `.clasprc.json` credentials.

---

## Security Best Practices

1. **Never commit `.clasprc.json`** - It's in `.gitignore` for a reason
2. **Rotate secrets periodically** - Revoke and recreate access if compromised
3. **Use separate secrets** - If sheets use different Google accounts, use different secrets
4. **Monitor workflow runs** - Check the Actions tab regularly for failures

---

## Maintenance

### Updating Credentials

When credentials need to be refreshed:

1. Run `clasp logout` and `clasp login` locally
2. Encode the new `.clasprc.json`
3. Update **all three GitHub secrets** (if same account)
4. Test by manually triggering one workflow

### Adding a New Sheet

To add automated deployment for a new sheet:

1. Create a new deployment directory: `deployments/new-sheet/`
2. Add `.clasp.json` with the Script ID
3. Add `config.json` with sheet configuration
4. Create a new workflow file: `.github/workflows/deploy-new-sheet.yml`
5. Add a new GitHub secret: `CLASPRC_NEW_SHEET`

---

## Summary

✅ **Automated deployment** saves time - pushes to `main` automatically deploy to all sheets
✅ **Separate workflows** allow independent deployment to each sheet
✅ **Shared source code** means one change updates all sheets
✅ **Secure credentials** are stored as GitHub secrets, never in code
✅ **Manual override** is always available if automation fails

For more details, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment guide
- [DEPLOYMENT_ORCHESTRATION.md](DEPLOYMENT_ORCHESTRATION.md) - Detailed orchestration plan
