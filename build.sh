#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parameters
REVISION="$1"
APP="$2"
BUMP="$3"
VALID_REVISIONS=("breadboard-dht" "breadboard-sht" "case-dht" "case-sht")
VALID_APPS=("app" "app2")
VALID_BUMPS=("major" "minor" "patch")

# Usage
if [[ -z "$REVISION" || -z "$APP" || -z "$BUMP" ]]; then
    echo "Usage: $0 <revision> <app> <bump>"
    echo ""
    echo "  revision: ${VALID_REVISIONS[*]}"
    echo "  app:      ${VALID_APPS[*]}"
    echo "  bump:     ${VALID_BUMPS[*]}"
    echo ""
    echo "Example: $0 breadboard-dht app patch"
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

# Validate bump
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

# --- Version bumping ---
VERSION_FILE="$SCRIPT_DIR/version.json"

if [[ ! -f "$VERSION_FILE" ]]; then
    echo '{"major": 0, "minor": 0, "patch": 0}' > "$VERSION_FILE"
fi

# Read current version
MAJOR=$(grep -o '"major": *[0-9]*' "$VERSION_FILE" | grep -o '[0-9]*')
MINOR=$(grep -o '"minor": *[0-9]*' "$VERSION_FILE" | grep -o '[0-9]*')
PATCH=$(grep -o '"patch": *[0-9]*' "$VERSION_FILE" | grep -o '[0-9]*')

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

# Write updated version back
cat > "$VERSION_FILE" <<EOF
{
  "major": $MAJOR,
  "minor": $MINOR,
  "patch": $PATCH
}
EOF

VERSION="$MAJOR.$MINOR.$PATCH"
echo "Version bumped to $VERSION"

# --- Build ---
echo "Building PicoThermostatCO (revision: $REVISION, app: $APP, version: $VERSION)..."

# Write version.py in dist so firmware can read it
cat > "$SCRIPT_DIR/src/version.py" <<EOF
VERSION = "$VERSION"
VERSION_MAJOR = $MAJOR
VERSION_MINOR = $MINOR
VERSION_PATCH = $PATCH
EOF

# Clean and create dist directory
rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$SCRIPT_DIR/dist"

# Copy src contents to dist
echo "Copying src to dist..."
cp -r "$SCRIPT_DIR/src/"* "$SCRIPT_DIR/dist/"

# Write hw_revision.py in dist
echo "HW_REVISION = \"$REVISION\"" > "$SCRIPT_DIR/dist/hw_revision.py"

# Build the web app
echo "Building web app ($APP)..."
cd "$SCRIPT_DIR/$APP"
npm run build

# Create releases directory
mkdir -p "$SCRIPT_DIR/releases"

# Create tar.gz archive of dist contents
echo "Creating release archive..."
cd "$SCRIPT_DIR/dist"
tar -czf "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" .

# Also create a 'latest' copy for convenience
cp "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" "$SCRIPT_DIR/releases/firmware-${REVISION}-latest.tar.gz"

echo ""
echo "Build complete! (v$VERSION)"
echo "Release archive: releases/firmware-${REVISION}-${VERSION}.tar.gz"
echo "Latest archive:  releases/firmware-${REVISION}-latest.tar.gz"