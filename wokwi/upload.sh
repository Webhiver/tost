#!/bin/bash
# Upload src/ contents to the running Wokwi simulator via rfc2217.
# Usage: wokwi/upload.sh
# Prereqs: Wokwi sim must be running with rfc2217ServerPort = 4000 in wokwi.toml.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"
PORT="${WOKWI_PORT:-4000}"
DEV="port:rfc2217://localhost:${PORT}"

cd "$SRC_DIR"

echo "Uploading .py files to Wokwi Pico..."
mpremote connect "$DEV" fs cp *.py :

if [ -d lib ]; then
  echo "Uploading lib/..."
  mpremote connect "$DEV" fs mkdir :lib 2>/dev/null || true
  mpremote connect "$DEV" fs cp lib/*.py :lib/
fi

echo "Soft-resetting to run main.py..."
mpremote connect "$DEV" soft-reset
