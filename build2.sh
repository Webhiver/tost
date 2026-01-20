#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building PicoThermostatCO..."

# Create dist directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/dist"

# Copy src contents to dist
echo "Copying src to dist..."
cp -r "$SCRIPT_DIR/src/"* "$SCRIPT_DIR/dist/"

# Build the web app
echo "Building web app..."
cd "$SCRIPT_DIR/app2"
npm run build

echo "Build complete!"
