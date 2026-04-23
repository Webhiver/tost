#!/bin/bash

# Exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Flags
QUIET=false
while getopts "q" opt; do
    case "$opt" in
        q) QUIET=true ;;
        *) echo "Usage: $0 [-q] <revision> [bump]" >&2; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

# Parameters
REVISION="$1"
BUMP="$2"
VALID_REVISIONS=("breadboard-dht" "breadboard-sht" "case-dht" "case-sht")
VALID_BUMPS=("major" "minor" "patch")

# Usage
if [[ -z "$REVISION" ]]; then
    echo "Usage: $0 [-q] <revision> [bump]" >&2
    echo "" >&2
    echo "  revision: ${VALID_REVISIONS[*]}" >&2
    echo "  bump:     ${VALID_BUMPS[*]} (optional, omit to keep current version)" >&2
    echo "" >&2
    echo "  -q: quiet mode, only errors are printed" >&2
    echo "" >&2
    echo "Example: $0 breadboard-dht" >&2
    echo "Example: $0 case-sht minor" >&2
    exit 1
fi

SPINNER_PID=""

start_spinner() {
    local frames=('|' '/' '-' '\')
    local i=0
    while true; do
        printf "\r[%s] Building..." "${frames[i]}" >&2
        sleep 0.15
        i=$(( (i + 1) % 4 ))
    done
}

stop_spinner() {
    if [[ -n "$SPINNER_PID" ]]; then
        kill "$SPINNER_PID" 2>/dev/null
        wait "$SPINNER_PID" 2>/dev/null || true
        printf "\r              \r" >&2
        SPINNER_PID=""
    fi
}

if [[ "$QUIET" == true ]]; then
    exec >/dev/null
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
    echo "Error: Invalid revision '$REVISION'" >&2
    echo "Valid revisions: ${VALID_REVISIONS[*]}" >&2
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
        echo "Error: Invalid bump type '$BUMP'" >&2
        echo "Valid bump types: ${VALID_BUMPS[*]}" >&2
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

echo ""
echo ""
if [[ -n "$BUMP" ]]; then
    # Write updated version back
    echo "VERSION = \"$VERSION\"" > "$VERSION_FILE"
    echo "Version bumped to $VERSION"
else
    echo "Version unchanged: $VERSION"
fi

# --- Build ---
echo ""
echo "Building TOST (revision: $REVISION, version: $VERSION)..." >&2
if [[ "$QUIET" == true ]]; then
    trap 'stop_spinner' EXIT
    start_spinner &
    SPINNER_PID=$!
fi

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
echo ""
echo "Creating release archive..."
cd "$SCRIPT_DIR/dist"
# On macOS, strip AppleDouble sidecars (._*) and pax extended headers (PaxHeader)
# so they don't end up on the device. Flags are bsdtar-specific, so gate on Darwin.
TAR_OPTS=()
if [[ "$(uname)" == "Darwin" ]]; then
    export COPYFILE_DISABLE=1
    TAR_OPTS+=(--no-xattrs --no-fflags --no-acls)
fi
tar "${TAR_OPTS[@]}" -czf "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" .

echo "Release archive created (releases/firmware-${REVISION}-${VERSION}.tar.gz)"

# Also create a 'latest' copy for convenience
# cp "$SCRIPT_DIR/releases/firmware-${REVISION}-${VERSION}.tar.gz" "$SCRIPT_DIR/releases/firmware-${REVISION}-latest.tar.gz"

stop_spinner

echo ""
echo "Build complete! (v$VERSION)" >&2
# echo "Latest archive:  releases/firmware-${REVISION}-latest.tar.gz"
