# Pico Thermostat Simulator

Node.js simulator that mimics the Pico thermostat's HTTP API. Currently always
runs in **satellite** mode. State and config live in memory only — nothing is
persisted between restarts.

Zero runtime dependencies (just Node's built-in `http`).

## Run locally

```bash
cd simulator
npm start
# or: PORT=9000 node src/index.js
```

Defaults: `HOST=0.0.0.0`, `PORT=8080` (local), `PORT=80` (Docker image).

The simulator auto-detects the host's primary IPv4 interface at startup and
reports its real IP and MAC in `/api/status`.

## Web UI

A small control panel is served at [`/`](http://localhost:8080/). It shows the
current sensor values plus the device's MAC / IP / firmware version, and has
`+`/`−` buttons (0.1 step) for temperature and humidity, a healthy toggle, and
a message field. It polls `/api/status` every 2s and writes changes via
`PATCH /api/simulator/state/sensor`.

## API

All API responses are JSON.

### Device endpoints (mirror the real firmware)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | Web UI (HTML) |
| `GET` | `/api/status` | `{ state, config }` — full device snapshot |
| `GET` | `/api/state` | Trimmed `{ sensor, wifi_strength, firmware_version }` in satellite mode |
| `GET` | `/api/config` | Full config |
| `POST` | `/api/config` | Replace config (in-memory) |
| `PATCH` | `/api/config` | Merge updates into config (in-memory) |
| `GET` | `/api/debug` | Memory/CPU/uptime/flash/system/network info |
| `POST` | `/api/sync` | Accepts `{ flame?, target_temperature?, operating_mode? }`. 403 if not in satellite mode. |
| `GET` | `/api/ping` | Health check |

### Simulator-only endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/simulator/state/sensor` | Replace the sensor object |
| `PATCH` | `/api/simulator/state/sensor` | Merge updates into sensor |

Example:

```bash
curl -X PATCH http://localhost:8080/api/simulator/state/sensor \
  -H 'Content-Type: application/json' \
  -d '{"temperature": 18.2}'
```

### `set-sensor.sh` — convenience wrapper

For the sensor endpoint there's a small helper that builds the JSON body for
you and targets a local simulator or a running Docker container.

```bash
./set-sensor.sh --temperature 18.5
./set-sensor.sh --container pico-sat-2 --temperature 22 --humidity 50
./set-sensor.sh --host 192.168.1.201 --port 80 --healthy false --message "Fault"
./set-sensor.sh --replace --temperature 22 --humidity 45 --healthy true --message ""
```

Fields (at least one required):

| Flag | Value |
| --- | --- |
| `--temperature` | Number, °C |
| `--humidity` | Number, % |
| `--healthy` | `true` / `false` (also accepts `1`/`0`, `yes`/`no`) |
| `--message` | String |

Target:

| Flag | Default | Notes |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Target host/IP |
| `--port` | `8080` | Target port |
| `--container` | _(none)_ | Docker container name; resolves IP via `docker inspect` and sets port to 80 |

Mode:

| Flag | Effect |
| --- | --- |
| _(default)_ | `PATCH` — merge the given fields into the current sensor |
| `--replace` | `POST` — replace the whole sensor object |

## Docker

The image is `node:22-alpine` with no install step (zero deps). It listens on
port 80 to match the real device.

```bash
docker build -t pico-sim simulator
docker run --rm -p 8080:80 pico-sim
```

### Running multiple satellites on your LAN (macvlan)

Each container gets its own MAC and LAN IP via a Docker macvlan network. This
is **Linux only** — Docker Desktop on macOS/Windows cannot bridge a macvlan to
the physical LAN.

Use `spawn.sh`:

```bash
cd simulator

# One-time: create the macvlan network (auto-detects parent/subnet/gateway)
export PICOSIM_IP_RANGE=192.168.1.200/28    # reserve a safe slice of your LAN
./spawn.sh network

# Start 5 satellites
./spawn.sh up 5

# Inspect
./spawn.sh list

# Stop & remove containers (keeps the network)
./spawn.sh down

# Remove containers and the network
./spawn.sh clean
```

MACs are assigned deterministically as `${PICOSIM_MAC_PREFIX}:NN` where `NN` is
the satellite index (1-based, hex). Defaults produce `2c:cf:67:00:00:01`,
`2c:cf:67:00:00:02`, … matching the OUI used by the real Pico W hardware.
Because the MACs are pinned, Docker re-uses them across restarts.

Containers are tagged with the label `picosim=true`; `down` and `clean` only
touch labeled containers.

#### Listing container IPs

`docker ps` doesn't show macvlan IPs. Two ways to see them:

```bash
# From the network (one row per attached container)
docker network inspect picolan \
  --format '{{range .Containers}}{{.Name}}	{{.IPv4Address}}	{{.MacAddress}}{{println}}{{end}}'

# From the containers (label-filtered, so only simulator containers)
docker inspect -f '{{.Name}}	{{range .NetworkSettings.Networks}}{{.IPAddress}}	{{.MacAddress}}{{end}}' \
  $(docker ps -q --filter label=picosim=true)
```

#### Script environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PICOSIM_NETWORK` | `picolan` | Docker network name |
| `PICOSIM_IP_RANGE` | _(unset)_ | Required unless `PICOSIM_ALLOW_FULL_SUBNET=1`. Reserve a slice of the LAN (e.g. `192.168.1.200/28`). |
| `PICOSIM_ALLOW_FULL_SUBNET` | _(unset)_ | Set to `1` to use the entire detected subnet (risk of DHCP collisions). |
| `PICOSIM_IMAGE` | `pico-sim` | Image tag |
| `PICOSIM_MAC_PREFIX` | `2c:cf:67:00:00` | First 5 bytes of each MAC |
| `PICOSIM_CONTAINER_PREFIX` | `pico-sat` | Container name prefix |

Max 254 satellites (single-byte MAC suffix).

### docker-compose alternative

`docker-compose.yml` defines three fixed satellites (`pico-sat-1..3`) with
pinned MACs, attached to the same external `picolan` network. Useful when you
want the same devices to come up predictably:

```bash
./spawn.sh network       # create picolan if it doesn't exist
docker compose up --build
```

## Caveats

- **Host ↔ macvlan container traffic is blocked** by a Linux kernel rule. Other
  devices on the LAN can reach the containers; the Docker host itself cannot
  without a macvlan shim interface. Usually fine when you test from another
  machine.
- `/api/debug.flash` and `/api/debug.memory` values come from Node / the host
  OS and aren't meaningful for fidelity — they just fill out the response
  shape so clients don't break.
