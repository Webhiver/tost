#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building PicoThermostatCO..."

# Clean and create dist directory
rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$SCRIPT_DIR/dist"

# Copy src contents to dist
echo "Copying src to dist..."
cp -r "$SCRIPT_DIR/src/"* "$SCRIPT_DIR/dist/"

# Build the web app
echo "Building web app..."
cd "$SCRIPT_DIR/app2"
npm run build

# Create releases directory
mkdir -p "$SCRIPT_DIR/releases"

# Generate version string (date-based)
VERSION=$(date +"%Y%m%d-%H%M%S")

# Create tar.gz archive of dist contents
echo "Creating release archive..."
cd "$SCRIPT_DIR/dist"
tar -czf "$SCRIPT_DIR/releases/firmware-$VERSION.tar.gz" .

# Also create a 'latest' symlink/copy for convenience
cp "$SCRIPT_DIR/releases/firmware-$VERSION.tar.gz" "$SCRIPT_DIR/releases/firmware-latest.tar.gz"
#cp "$SCRIPT_DIR/releases/firmware-$VERSION.tar.gz" "$SCRIPT_DIR/releases/update.tar.gz"

echo ""
echo "Build complete!"
echo "Release archive: releases/firmware-$VERSION.tar.gz"
echo "Latest archive:  releases/firmware-latest.tar.gz"
