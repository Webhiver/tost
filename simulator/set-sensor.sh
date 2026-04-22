#!/usr/bin/env bash
set -euo pipefail

HOST="127.0.0.1"
PORT="8080"
CONTAINER=""
METHOD="PATCH"
TEMPERATURE=""
HUMIDITY=""
HEALTHY=""
MESSAGE=""

usage() {
  cat <<EOF
Usage: $0 [options]

Updates a satellite's sensor state via /api/simulator/state/sensor.
At least one of --temperature, --humidity, --healthy, --message is required.

Target:
  --host HOST           Target host/IP (default: $HOST)
  --port PORT           Target port (default: $PORT)
  --container NAME      Resolve IP from a running Docker container
                        (overrides --host, sets --port to 80)

Sensor fields:
  --temperature N       Temperature in °C (number)
  --humidity N          Humidity in % (number)
  --healthy true|false  Sensor health flag
  --message TEXT        Status message string

Mode:
  --replace             Use POST to fully replace the sensor object
                        (default is PATCH / merge)
  -h, --help            Show this help

Examples:
  $0 --temperature 18.5
  $0 --container pico-sat-2 --temperature 22 --humidity 50
  $0 --host 192.168.1.201 --port 80 --healthy false --message "Fault"
EOF
}

die() { echo "$*" >&2; exit 2; }

while (( $# > 0 )); do
  case "$1" in
    --host)        [[ $# -ge 2 ]] || die "--host needs a value"; HOST="$2"; shift 2 ;;
    --port)        [[ $# -ge 2 ]] || die "--port needs a value"; PORT="$2"; shift 2 ;;
    --container)   [[ $# -ge 2 ]] || die "--container needs a value"; CONTAINER="$2"; shift 2 ;;
    --temperature) [[ $# -ge 2 ]] || die "--temperature needs a value"; TEMPERATURE="$2"; shift 2 ;;
    --humidity)    [[ $# -ge 2 ]] || die "--humidity needs a value"; HUMIDITY="$2"; shift 2 ;;
    --healthy)     [[ $# -ge 2 ]] || die "--healthy needs a value"; HEALTHY="$2"; shift 2 ;;
    --message)     [[ $# -ge 2 ]] || die "--message needs a value"; MESSAGE="$2"; shift 2 ;;
    --replace)     METHOD="POST"; shift ;;
    -h|--help)     usage; exit 0 ;;
    *)             echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

is_number() { [[ "$1" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; }

parts=()

if [[ -n "$TEMPERATURE" ]]; then
  is_number "$TEMPERATURE" || die "--temperature must be a number, got: $TEMPERATURE"
  parts+=("\"temperature\":$TEMPERATURE")
fi
if [[ -n "$HUMIDITY" ]]; then
  is_number "$HUMIDITY" || die "--humidity must be a number, got: $HUMIDITY"
  parts+=("\"humidity\":$HUMIDITY")
fi
if [[ -n "$HEALTHY" ]]; then
  case "$HEALTHY" in
    true|1|yes|y)  parts+=('"healthy":true') ;;
    false|0|no|n)  parts+=('"healthy":false') ;;
    *) die "--healthy must be true or false, got: $HEALTHY" ;;
  esac
fi
if [[ -n "$MESSAGE" ]]; then
  esc=${MESSAGE//\\/\\\\}
  esc=${esc//\"/\\\"}
  parts+=("\"message\":\"$esc\"")
fi

if (( ${#parts[@]} == 0 )); then
  echo "Must specify at least one sensor field." >&2
  usage >&2
  exit 2
fi

if [[ -n "$CONTAINER" ]]; then
  command -v docker >/dev/null 2>&1 || die "docker not found (required for --container)"
  IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER" 2>/dev/null) \
    || die "Container not found: $CONTAINER"
  [[ -n "$IP" ]] || die "Container $CONTAINER has no IP"
  HOST="$IP"
  PORT="80"
fi

body="{$(IFS=,; echo "${parts[*]}")}"
url="http://${HOST}:${PORT}/api/simulator/state/sensor"

echo "$METHOD $url"
echo "Body: $body"
curl -sS -X "$METHOD" "$url" \
  -H 'Content-Type: application/json' \
  -d "$body"
echo
