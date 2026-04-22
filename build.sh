#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parameters
REVISION="$1"
BUMP="$3"
VALID_REVISIONS=("breadboard-dht" "breadboard-sht" "case-dht" "case-sht")
VALID_BUMPS=("major" "minor" "patch")

# Usage
if [[ -z "$REVISION" ]]; then
    echo "Usage: $0 <revision> [bump]"
    echo ""
    echo "  revision: ${VALID_REVISIONS[*]}"
    echo "  bump:     ${VALID_BUMPS[*]} (optional, omit to keep current version)"
    echo ""
    echo "Example: $0 breadboard-dht"
    echo "Example: $0 case-sht minor"
    exit 1
fi

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

# Validate bump (optional)
if [[ -n "$BUMP" ]]; then
    valid=false
    for b in "${VALID_BUMPS[@]}"; do
        if [[ "$b" == "$BUMP" ]]; then
            valid=true
            break
        fi
    done
    if [[ "$valid" != true ]]; then
        echo "Error: Invalid bump type '$BUMP'"
        echo "Valid bump types: ${VALID_BUMPS[*]}"
        exit 1
    fi
fi

# --- Version bumping ---
VERSION_FILE="$SCRIPT_DIR/src/version.py"

if [[ ! -f "$VERSION_FILE" ]]; then
    echo 'VERSION = "0.0.0"' > "$VERSION_FILE"
fi

# Read current version
CURRENT_VERSION=$(grep -o '"[^"]*"' "$VERSION_FILE" | tr -d '"')
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)

# Bump the requested part
case "$BUMP" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"

if [[ -n "$BUMP" ]]; then
    # Write updated version back
    echo "VERSION = \"$VERSION\"" > "$VERSION_FILE"
    echo "Version bumped to $VERSION"
else
    echo "Version unchanged: $VERSION"
fi

# --- Build ---
echo "Building PicoThermostatCO (revision: $REVISION, version: $VERSION)..."

# Clean and create dist directory
rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$SCRIPT_DIR/dist"

# Copy src contents to dist
echo "Copying src to dist..."
cp -r "$SCRIPT_DIR/src/"* "$SCRIPT_DIR/dist/"

# Write hw_revision.py in dist
echo "HW_REVISION = \"$REVISION\"" > "$SCRIPT_DIR/dist/hw_revision.py"

# Build the web app
echo "Building web app..."
cd "$SCRIPT_DIR/app"
npm run build

# Create releases directory
mkdir -p "$SCRIPT_DIR/releases"

# Create tar.gz archive of dist contents
echo "Creating release archive..."
cd "$SCRIPT_DIR/dist"
tar -czf "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" .

# Also create a 'latest' copy for convenience
# cp "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" "$SCRIPT_DIR/releases/firmware-${REVISION}-latest.tar.gz"

echo ""
echo "Build complete! (v$VERSION)"
echo "Release archive: releases/firmware-${REVISION}-${VERSION}.tar.gz"
# echo "Latest archive:  releases/firmware-${REVISION}-latest.tar.gz"