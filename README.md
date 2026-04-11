# PicoThermostat

A DIY smart thermostat system built on the **Raspberry Pi Pico 2W** running MicroPython. Features temperature monitoring, relay control for heating, WiFi connectivity, and a modern web interface.

## Features

- 🌡️ **Temperature & Humidity Monitoring** - DHT22 sensor with sanity checks
- 🔥 **Smart Heating Control** - Configurable hysteresis and safety cutoffs
- 📡 **Multi-Zone Support** - Host/Satellite architecture for multiple rooms
- 🌐 **WiFi Setup** - Easy pairing via captive portal
- 💡 **LED Status Indicators** - RGB LED with priority-based color codes
- 📱 **Modern Web Interface** - Responsive design for mobile & desktop
- ⚡ **Watchdog Timer** - Auto-recovery from system hangs

## Hardware Requirements

### Components

- Raspberry Pi Pico 2W
- DHT22 Temperature & Humidity Sensor
- Relay Module (5V)
- RGB LED (Common Cathode)
- Push Button
- Resistors (for LED limiting)

### Wiring

| Component | GPIO Pin | Notes |
|-----------|----------|-------|
| RGB LED Red | GP11 | Use 220Ω resistor |
| RGB LED Green | GP12 | Use 220Ω resistor |
| RGB LED Blue | GP13 | Use 220Ω resistor |
| DHT22 Data | GP28 | Pull-up resistor (4.7kΩ) |
| Relay Signal | GP15 | Active HIGH |
| Button | GP1 | Internal pull-up |

## Installation

### 1. Flash MicroPython

Download and flash the latest MicroPython firmware for Pico W from [micropython.org](https://micropython.org/download/rp2-pico-w/).

### 2. Upload Files

Copy all project files to the Pico using Thonny, rshell, or mpremote:

```
├── main.py
├── hardware_config.py
├── config_manager.py
├── state_manager.py
├── sensor_manager.py
├── led_manager.py
├── relay_manager.py
├── button_manager.py
├── satellite_manager.py
├── pairing_manager.py
├── thermostat.py
├── web_server.py
├── .env/              # Git-ignored config files
│   ├── config.json
│   ├── secrets.json
│   └── env.py
├── lib/
│   ├── microdot.py
│   └── picozero.py
└── app/
    ├── index.html
    ├── styles.css
    └── app.js
```

### 3. First Boot

1. Power on the Pico
2. The LED will blink blue (Pairing Mode)
3. Connect to `PicoThermostat_XXXX` WiFi network
4. Navigate to `192.168.4.1` in your browser
5. Select your home WiFi network and enter password
6. Device will restart and connect to your WiFi

## LED Status Codes

| Priority | Color | State | Meaning |
|----------|-------|-------|---------|
| 1 | 🔵 Blue | Blinking | Pairing Mode (AP Active) |
| 2 | 🟡 Yellow | Solid | No WiFi Connection |
| 3 | 🔴 Red | Solid | Heating (Relay Active) |
| 4 | 🟢 Green | Solid | Idle (Connected) |

## Operating Modes

### Host Mode

The primary thermostat controller that:
- Reads local temperature sensor
- Polls satellite sensors
- Controls the heating relay
- Hosts the web interface
- Runs the thermostat algorithm

### Satellite Mode

A remote temperature sensor that:
- Reads local temperature sensor
- Exposes readings via API for host polling
- Shows read-only web interface

## Web API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Full system status (Host) |
| GET | `/api/readings` | Current sensor data (Satellite) |
| GET | `/api/config` | Get configuration |
| POST | `/api/config` | Replace configuration |
| PATCH | `/api/config` | Partial config update |
| GET | `/api/wifi/scan` | Scan WiFi networks |
| POST | `/api/wifi/connect` | Save WiFi credentials |

### Status Response Example

```json
{
    "config": { ... },
    "is_pairing": false,
    "wifi_connected": true,
    "sensor": {
        "temperature": 21.5,
        "humidity": 45.0
    },
    "flame": false,
    "flame_duration": 0,
    "satellites": [
        {
            "ip": "192.168.1.50",
            "sensor": { "temperature": 20.5, "humidity": 48.0 },
            "online": true
        }
    ]
}
```

## Configuration

### .env/config.json

```json
{
    "mode": "host",
    "target_temperature": 22.0,
    "hysteresis": 1.0,
    "satellites": ["192.168.1.50"],
    "update_interval": 4,
    "satellite_grace_period": 120,
    "led_brightness": 1.0,
    "flame_on_mode": "average",
    "flame_off_mode": "average",
    "local_sensor": "included",
    "max_flame_duration": 14400,
    "flame_cooldown": 1800
}
```

### Configuration Options

| Option                   | Type | Description                                            |
|--------------------------|------|--------------------------------------------------------|
| `mode`                   | string | `"host"` or `"satellite"`                              |
| `target_temperature`     | float | Target temperature in °C                               |
| `hysteresis`             | float | Temperature buffer to prevent short-cycling            |
| `satellites`             | array | List of satellite IP addresses                         |
| `update_interval`        | int | Seconds between satellite polls                        |
| `satellite_grace_period` | int | Seconds before marking satellite offline               |
| `led_brightness`         | float | LED brightness (0.0 - 1.0)                             |
| `flame_on_mode`          | string | `"average"` or `"all"` for turn-on logic               |
| `flame_off_mode`         | string | `"average"` or `"all"` for turn-off logic              |
| `local_sensor`           | string | `"included"` or `"fallback"`                           |
| `max_flame_duration`     | int | Safety cutoff in seconds (4 hours default)             |
| `flame_cooldown`         | int | Cooldown interval after flame off (30 minutes default) |

## Thermostat Algorithm

### Flame ON Conditions

- **Average Mode**: Turn on if average of all sensors < target - hysteresis
- **All Mode**: Turn on if ALL sensors < target - hysteresis

### Flame OFF Conditions

- **Safety**: Force off if flame_duration > max_flame_duration
- **Average Mode**: Turn off if average > target + hysteresis
- **All Mode**: Turn off if ALL sensors > target + hysteresis

### Local Sensor Rules

- **Included**: Always include local sensor in calculations
- **Fallback**: Only use local sensor if no satellites are online

## Button Controls

- **Long Press (3+ seconds)**: Toggle Pairing Mode

## Safety Features

- ⏱️ **Watchdog Timer**: Auto-resets if system hangs (8 second timeout)
- 🔥 **Max Flame Duration**: Automatic cutoff after 4 hours
- 🌡️ **Sanity Checks**: Ignores readings outside -40°C to 80°C range
- 📡 **Satellite Grace Period**: Continues operation if satellites temporarily offline

## Troubleshooting

### Device won't connect to WiFi
1. Long-press button for 3+ seconds to enter pairing mode
2. Connect to the PicoThermostat access point
3. Re-enter WiFi credentials

### Temperature reading shows "--"
- Check DHT22 wiring
- Ensure pull-up resistor is present on data line
- Sensor may need a moment to warm up

### Relay clicking rapidly
- Increase hysteresis value in settings
- Check for drafts near sensor
- Verify wiring connections

### LED not working
- Check common cathode connection to GND
- Verify resistors are present on each color
- Adjust LED brightness in settings

## Development Setup

### Prerequisites

- [Python 3.11+](https://www.python.org/downloads/)
- A Raspberry Pi Pico 2W connected via USB

### 1. Create a Virtual Environment

```bash
python -m venv .venv
```

Activate it:

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **Windows (cmd):** `.venv\Scripts\activate.bat`
- **Windows (Git Bash):** `source .venv/Scripts/activate`
- **Linux / macOS:** `source .venv/bin/activate`

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs `pyserial`, `textual`, and `mpremote`.

### 3. Run the REPL Tool

```bash
python tools/repl.py
```

This launches a terminal UI (built with [Textual](https://textual.textualize.io/)) that lets you:

- **Connect** to one or more Pico boards over serial (COM ports)
- **Interact** with the MicroPython REPL on each board
- **Deploy** files to the Pico using deploy profiles defined in `deploy.toml`

On startup you'll be prompted to select which COM ports to monitor. Pick the ports corresponding to your connected Picos and the tool handles the rest.
