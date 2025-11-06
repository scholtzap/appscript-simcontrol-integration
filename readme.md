# SimControl Integration System

**Version**: 2.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-11-04

A unified Google Apps Script system for managing SIM cards, tracking usage, and integrating with SimControl API, FOTA Web, and other services.

---

## 🎯 Overview

This project consolidates multiple legacy Apps Script projects into a single, modular, maintainable system. It provides automated SIM management, usage tracking (airtime & data), recharge monitoring, analytics, and more—all accessible through a dynamic Google Sheets menu.

### Key Benefits

- ✅ **Unified Codebase** - One system instead of 6+ legacy scripts
- ✅ **Modular Architecture** - Enable/disable integrations via configuration
- ✅ **Automated Deployment** - GitHub Actions CI/CD pipeline
- ✅ **Comprehensive Testing** - Automated validation suite
- ✅ **Multi-Account Support** - Deploy to multiple Google accounts
- ✅ **Production Ready** - Full documentation, testing, and rollback procedures

---

## 📋 Features

### Core Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **SIM Management** | Fetch, filter, and manage SIM cards | ✅ Complete |
| **Usage Tracking** | Airtime (ZAR) and Data (MB) tracking with historical fetch | ✅ Complete |
| **Recharge Monitoring** | Track recharges and product catalogs | ✅ Complete |
| **Analytics** | Usage age analysis, high usage filtering | ✅ Complete |
| **FOTA Web Integration** | Teltonika device management | ✅ Complete |
| **QR Code Generator** | WhatsApp QR codes with Drive storage | ✅ Complete |
| **Automated Triggers** | Daily scheduled data fetching | ✅ Complete |
| **Rate Limiting** | Automatic API rate limit detection and handling | ✅ Complete |
| **Debug Logging** | Comprehensive logging to Google Sheet | ✅ Complete |

---

## 🚀 Quick Start

### Prerequisites

- Google Account with Apps Script API enabled
- SimControl API key
- Node.js v18+ and CLASP installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-org]/appscript-simcontrol-integration.git
   cd appscript-simcontrol-integration
   ```

2. **Install CLASP**
   ```bash
   npm install -g @google/clasp
   ```

3. **Authenticate with Google**
   ```bash
   clasp login
   ```

4. **Deploy to your account**
   ```bash
   cd deployments/account1-airtime
   clasp push --force
   ```

5. **Configure Script Properties**
   - Open Apps Script editor
   - Project Settings → Script Properties
   - Add: `SIMCONTROL_API_KEY` with your API key

6. **Test the System**
   ```
   Menu → Utilities → Run Full Test Suite
   ```

---

## 📖 Documentation

| Document | Description | Size |
|----------|-------------|------|
| [spec.md](spec.md) | System architecture and design | ~15KB |
| [ROADMAP.md](ROADMAP.md) | Implementation progress tracking | ~10KB |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment guide | 11KB |
| [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) | **⭐ Automated deployment setup** | 12KB |
| [TESTING.md](TESTING.md) | Testing procedures | 17KB |
| [MIGRATION.md](MIGRATION.md) | Production rollout guide | 20KB |
| [DEPLOYMENT_ORCHESTRATION.md](DEPLOYMENT_ORCHESTRATION.md) | **⭐ Tactical deployment plan** | 25KB |
| [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) | Quick reference card | 7KB |
| [PRODUCTION_SHEETS.md](PRODUCTION_SHEETS.md) | Production sheet mapping | 6KB |
| [NEW_SESSION_CONTEXT.md](NEW_SESSION_CONTEXT.md) | Context for new LLM sessions | 15KB |

---

## 🤖 Automated Deployment

The project uses **GitHub Actions** to automatically deploy code changes to all Google Sheets when you push to the `main` branch.

### Active Deployments

| Sheet Name | Workflow | Status |
|------------|----------|--------|
| 3BO SIM Data | deploy-3bo-sim-data.yml | ✅ Active |
| Plentify SimControl Data | deploy-plentify-simcontrol-data.yml | ✅ Active |
| WiFi Gateways Provisioning | deploy-wifi-gateways-provisioning.yml | ✅ Active |

### How It Works

1. Push changes to `main` branch (especially `src/**` files)
2. GitHub Actions automatically triggers
3. Code is deployed to all 3 Google Sheets simultaneously
4. No manual `clasp push` required!

**Setup Guide**: See [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for complete configuration instructions.

---

## 📊 Usage

### Daily Operations (Automated)

System runs automatically via triggers. No manual intervention required.

### Manual Operations

```
Menu → Data Usage → Download All Historical Data
Menu → SIM Management → Analyze Usage Age
Menu → Utilities → View Debug Log
```

---

## 🎉 Project Status

**Overall**: 100% Complete ✨

- ✅ 19 code modules (~5,200 lines)
- ✅ 5 documentation guides (~73KB)
- ✅ 15+ automated validators
- ✅ 3 multi-account deployments
- ✅ 2 CI/CD workflows

---

**Ready for production! 🚀**

### Deploying to Existing Production Sheets?

**Start here**: [DEPLOYMENT_ORCHESTRATION.md](DEPLOYMENT_ORCHESTRATION.md) - Complete tactical plan for migrating existing Google Sheets to the new codebase with zero data loss.

**Quick reference**: [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) - 1-page guide for experienced deployers.

### New Deployments

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying to fresh Google Sheets.
See [MIGRATION.md](MIGRATION.md) for user training and rollout procedures.
