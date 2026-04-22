#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

NETWORK_NAME="${PICOSIM_NETWORK:-picolan}"
IMAGE_NAME="${PICOSIM_IMAGE:-pico-sim}"
MAC_PREFIX="${PICOSIM_MAC_PREFIX:-2c:cf:67:00:00}"
CONTAINER_PREFIX="${PICOSIM_CONTAINER_PREFIX:-pico-sat}"
LABEL="picosim=true"

detect_network() {
  if ! command -v ip >/dev/null 2>&1; then
    echo "note: 'ip' command not found — auto-detection is Linux-only" >&2
    return 1
  fi
  local default_line
  default_line=$(ip -4 route show default 2>/dev/null | head -n1) || true
  [[ -z "$default_line" ]] && { echo "note: no default route found" >&2; return 1; }
  GATEWAY=$(awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' <<<"$default_line")
  PARENT=$(awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' <<<"$default_line")
  [[ -z "$GATEWAY" || -z "$PARENT" ]] && return 1
  # Use the kernel-added link route for the network CIDR (network address, not
  # the host's address): e.g. "10.0.0.0/24 proto kernel scope link src 10.0.0.20".
  SUBNET=$(ip -4 route show dev "$PARENT" scope link proto kernel 2>/dev/null \
    | awk '{print $1; exit}')
  [[ -z "$SUBNET" ]] && return 1
  return 0
}

ensure_image() {
  if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "Building image $IMAGE_NAME..."
    docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"
  fi
}

list_containers() {
  docker ps -a --filter "label=$LABEL" --format '{{.ID}}'
}

cmd_network() {
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "Network '$NETWORK_NAME' already exists."
    return 0
  fi
  if ! detect_network; then
    cat >&2 <<EOF
Cannot auto-detect network settings. Create it manually:
  docker network create -d macvlan \\
    --subnet=<CIDR> --gateway=<IP> -o parent=<iface> \\
    [--ip-range=<CIDR>] $NETWORK_NAME
EOF
    return 1
  fi
  echo "Detected: parent=$PARENT subnet=$SUBNET gateway=$GATEWAY"

  local range_flag=()
  if [[ -n "${PICOSIM_IP_RANGE:-}" ]]; then
    range_flag=(--ip-range="$PICOSIM_IP_RANGE")
    echo "Using ip-range=$PICOSIM_IP_RANGE"
  elif [[ "${PICOSIM_ALLOW_FULL_SUBNET:-}" == "1" ]]; then
    echo "WARNING: using full subnet $SUBNET — may collide with DHCP-assigned devices."
  else
    cat >&2 <<EOF
Refusing to create network without PICOSIM_IP_RANGE.
Using the full LAN subnet can collide with DHCP-assigned devices.
Either:
  export PICOSIM_IP_RANGE=192.168.1.200/28   # reserved slice (adjust)
  export PICOSIM_ALLOW_FULL_SUBNET=1         # or accept the risk
EOF
    return 1
  fi

  docker network create -d macvlan \
    --subnet="$SUBNET" \
    --gateway="$GATEWAY" \
    "${range_flag[@]}" \
    -o parent="$PARENT" \
    "$NETWORK_NAME"
  echo "Created network '$NETWORK_NAME'."
}

cmd_up() {
  local count="${1:-1}"
  if ! [[ "$count" =~ ^[0-9]+$ ]] || (( count < 1 )); then
    echo "up: expected a positive integer count, got '$count'" >&2
    return 2
  fi
  if (( count > 254 )); then
    echo "up: mac suffix is a single byte — max 254 satellites" >&2
    return 2
  fi
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "Network '$NETWORK_NAME' not found. Run: $0 network" >&2
    return 1
  fi
  ensure_image

  for i in $(seq 1 "$count"); do
    local name mac
    name=$(printf "%s-%d" "$CONTAINER_PREFIX" "$i")
    mac=$(printf "%s:%02x" "$MAC_PREFIX" "$i")
    if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
      echo "Skipping $name (already exists)"
      continue
    fi
    docker run -d \
      --name "$name" \
      --hostname "$name" \
      --network "$NETWORK_NAME" \
      --mac-address "$mac" \
      --restart unless-stopped \
      --label "$LABEL" \
      --label "picosim.index=$i" \
      "$IMAGE_NAME" >/dev/null
    echo "Started $name (mac=$mac)"
  done
}

cmd_down() {
  local ids
  ids=$(list_containers)
  if [[ -z "$ids" ]]; then
    echo "No simulator containers to remove."
    return 0
  fi
  # shellcheck disable=SC2086
  docker rm -f $ids >/dev/null
  echo "Removed $(wc -w <<<"$ids" | tr -d ' ') container(s)."
}

cmd_list() {
  docker ps -a --filter "label=$LABEL" \
    --format 'table {{.Names}}\t{{.Status}}\t{{.Networks}}'
}

cmd_clean() {
  cmd_down
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network rm "$NETWORK_NAME" >/dev/null
    echo "Removed network '$NETWORK_NAME'."
  fi
}

usage() {
  cat <<EOF
Usage: $0 <command> [args]

Commands:
  network     Create the macvlan network (auto-detects subnet/gateway/parent).
  up [N]      Start N satellite containers (default: 1). Builds image if needed.
  down        Stop and remove all simulator containers.
  list        Show simulator containers.
  clean       down + remove the macvlan network.

Environment:
  PICOSIM_NETWORK            Network name (default: picolan)
  PICOSIM_IP_RANGE           Reserved IP slice, e.g. 192.168.1.200/28 (required
                             unless PICOSIM_ALLOW_FULL_SUBNET=1)
  PICOSIM_ALLOW_FULL_SUBNET  Set to 1 to use the full detected subnet
  PICOSIM_IMAGE              Image tag (default: pico-sim)
  PICOSIM_MAC_PREFIX         MAC prefix, 5 bytes (default: 2c:cf:67:00:00)
  PICOSIM_CONTAINER_PREFIX   Container name prefix (default: pico-sat)
EOF
}

case "${1:-}" in
  network)     cmd_network ;;
  up)          shift; cmd_up "${1:-1}" ;;
  down|stop)   cmd_down ;;
  list|ls|ps)  cmd_list ;;
  clean)       cmd_clean ;;
  -h|--help|help|"") usage ;;
  *) echo "Unknown command: $1" >&2; usage >&2; exit 2 ;;
esac
