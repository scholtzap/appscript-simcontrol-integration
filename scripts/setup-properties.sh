#!/bin/bash
#
# Setup Script Properties via CLASP
# Usage: ./scripts/setup-properties.sh <deployment-folder>
# Example: ./scripts/setup-properties.sh deployments/account1-airtime
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if deployment folder provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Deployment folder not specified${NC}"
  echo "Usage: ./scripts/setup-properties.sh <deployment-folder>"
  echo "Example: ./scripts/setup-properties.sh deployments/account1-airtime"
  exit 1
fi

DEPLOYMENT_DIR="$1"

# Check if deployment directory exists
if [ ! -d "$DEPLOYMENT_DIR" ]; then
  echo -e "${RED}Error: Deployment directory does not exist: $DEPLOYMENT_DIR${NC}"
  exit 1
fi

# Check if config.json exists
if [ ! -f "$DEPLOYMENT_DIR/config.json" ]; then
  echo -e "${RED}Error: config.json not found in $DEPLOYMENT_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}=== Setting Script Properties ===${NC}"
echo "Deployment: $DEPLOYMENT_DIR"
echo ""

# Change to deployment directory
cd "$DEPLOYMENT_DIR"

# Check if .clasp.json exists
if [ ! -f ".clasp.json" ]; then
  echo -e "${RED}Error: .clasp.json not found in $DEPLOYMENT_DIR${NC}"
  exit 1
fi

# Extract scriptId from .clasp.json
SCRIPT_ID=$(grep -o '"scriptId"[[:space:]]*:[[:space:]]*"[^"]*"' .clasp.json | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$SCRIPT_ID" ]; then
  echo -e "${RED}Error: Could not extract scriptId from .clasp.json${NC}"
  exit 1
fi

echo "Script ID: $SCRIPT_ID"
echo ""

# Parse config.json and set properties
# Note: This requires jq to be installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed${NC}"
  echo "Please install jq: sudo apt-get install jq (Linux) or brew install jq (Mac)"
  exit 1
fi

# Extract all scriptProperties
PROPERTIES=$(jq -r '.scriptProperties | to_entries[] | "\(.key)=\(.value)"' ../../../"$DEPLOYMENT_DIR"/config.json)

if [ -z "$PROPERTIES" ]; then
  echo -e "${RED}Error: No properties found in config.json${NC}"
  exit 1
fi

echo -e "${YELLOW}Properties to set:${NC}"
echo "$PROPERTIES"
echo ""

# Confirm before proceeding
read -p "Set these properties to script $SCRIPT_ID? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Set each property using CLASP
echo ""
echo -e "${GREEN}Setting properties...${NC}"

# Create a temporary Apps Script file to set properties
cat > /tmp/set-properties.js << 'EOF'
/**
 * Set script property
 * Usage: clasp run setProperty -p '["KEY", "value"]'
 */
function setProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  return 'Set: ' + key + ' = ' + value;
}

/**
 * Get all properties (for verification)
 */
function getAllProperties() {
  return PropertiesService.getScriptProperties().getProperties();
}

/**
 * Set multiple properties from JSON
 * Usage: clasp run setProperties -p '[{"key": "value"}]'
 */
function setProperties(propsObj) {
  var props = PropertiesService.getScriptProperties();
  var count = 0;
  for (var key in propsObj) {
    props.setProperty(key, propsObj[key]);
    count++;
  }
  return 'Set ' + count + ' properties';
}
EOF

echo -e "${YELLOW}Note: Manual property setting is recommended${NC}"
echo "Automated CLASP property setting is not fully supported."
echo ""
echo "Please set properties manually:"
echo "1. Open Apps Script editor: clasp open"
echo "2. Go to Project Settings (gear icon)"
echo "3. Scroll to Script Properties"
echo "4. Add each property from config.json"
echo ""
echo -e "${GREEN}Properties from config.json:${NC}"
echo "$PROPERTIES"
echo ""

# Alternative: Show CLASP commands
echo -e "${YELLOW}Alternatively, use these CLASP commands (if setProperty function exists):${NC}"
echo ""

while IFS='=' read -r key value; do
  # Escape quotes in value
  escaped_value=$(echo "$value" | sed 's/"/\\"/g')
  echo "clasp run setProperty -p '[\"$key\", \"$escaped_value\"]'"
done <<< "$PROPERTIES"

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "Verify properties in Apps Script: Project Settings → Script Properties"
