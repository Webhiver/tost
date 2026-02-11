#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parameters
REVISION="${1:-breadboard-dht}"
APP="${2:-app}"
VALID_REVISIONS=("breadboard-dht" "breadboard-sht" "case-dht" "case-sht")
VALID_APPS=("app" "app2")

# Validate revision
valid=false
for r in "${VALID_REVISIONS[@]}"; do
    if [[ "$r" == "$REVISION" ]]; then
        valid=true
        break
    fi
done
if [[ "$valid" != true ]]; then
    echo "Error: Invalid revision '$REVISION'"
    echo "Valid revisions: ${VALID_REVISIONS[*]}"
    exit 1
fi

# Validate app
valid=false
for a in "${VALID_APPS[@]}"; do
    if [[ "$a" == "$APP" ]]; then
        valid=true
        break
    fi
done
if [[ "$valid" != true ]]; then
    echo "Error: Invalid app '$APP'"
    echo "Valid apps: ${VALID_APPS[*]}"
    exit 1
fi

echo "Building PicoThermostatCO (revision: $REVISION, app: $APP)..."

# Write hw_revision.py
echo "HW_REVISION = \"$REVISION\"" > "$SCRIPT_DIR/src/hw_revision.py"

# Clean and create dist directory
rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$SCRIPT_DIR/dist"

# Copy src contents to dist
echo "Copying src to dist..."
cp -r "$SCRIPT_DIR/src/"* "$SCRIPT_DIR/dist/"

# Build the web app
echo "Building web app ($APP)..."
cd "$SCRIPT_DIR/$APP"
npm run build

# Create releases directory
mkdir -p "$SCRIPT_DIR/releases"

# Generate version string (date-based)
VERSION=$(date +"%Y%m%d-%H%M%S")

# Create tar.gz archive of dist contents
echo "Creating release archive..."
cd "$SCRIPT_DIR/dist"
tar -czf "$SCRIPT_DIR/releases/firmware-${REVISION}-$VERSION.tar.gz" .

# Also create a 'latest' copy for convenience
cp "$SCRIPT_DIR/releases/firmware-${REVISION}-$VERSION.tar.gz" "$SCRIPT_DIR/releases/firmware-${REVISION}-latest.tar.gz"

echo ""
echo "Build complete!"
echo "Release archive: releases/firmware-${REVISION}-$VERSION.tar.gz"
echo "Latest archive:  releases/firmware-${REVISION}-latest.tar.gz"
