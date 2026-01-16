# PicoThermostat Technical Specification v1.1

## 1. Overview

The PicoThermostat is a DIY thermostat system built on the Raspberry Pi Pico 2W. It operates in two modes:

- **Host**: Acts as a central thermostat controller, reading local temperature, managing the relay (heating/cooling), and hosting a web interface.
    
- **Satellite**: Acts as a remote temperature sensor. Will only have one endpoint to read temperature and humidity.
    

Both modes share a common codebase written in MicroPython.

## 2. Hardware Architecture

### 2.1 Core Components

- **Microcontroller**: Raspberry Pi Pico 2W (WiFi enabled)
    
- **Sensor**: DHT22 (Temperature & Humidity)
    
- **Actuator**: Relay Module
    
- **Interface**:
    
    - RGB LED (Common Cathode) for status indication
        
    - Push Button for user input (Pairing)
        

### 2.2 Pin Configuration

The hardware pinout definitions will be stored in `hardware_config.py`.

|Component|Pin (GP)|Notes|
|---|---|---|
|**RGB LED Red**|11||
|**RGB LED Green**|12||
|**RGB LED Blue**|13||
|**DHT Sensor**|28|Pull-up resistor required if not on module|
|**Relay**|15|Standard GPIO (do not use onboard LED)|
|**Button**|1||

## 3. System States & Feedback

### 3.1 RGB LED Status Codes

The RGB LED provides immediate visual feedback. The status is prioritized; the system displays the color of the **highest priority** active condition.

|Priority|Color|State|Condition|
|---|---|---|---|
|**1**|**Blue**|Blinking|Pairing Mode (Access Point Active)|
|**2**|**Yellow**|Solid|No Network Connection|
|**3**|**Red**|Solid|Flame On (Relay Active / Heating)|
|**4**|**Green**|Solid|Network Connected / Idle (Flame Off)|
|**5**|**Off**|Unpowered|System is off|

### 3.2 Button Interactions

- **Long Press (> 3s)**: Enter/Exit Pairing Mode.
    

## 4. Operation

### 4.1 Operating Modes

#### Host Mode

- Connects to WiFi.
    
- **Watchdog**: Pets the hardware Watchdog Timer (WDT) every loop iteration. System resets if hung for >8 seconds.
    
- **Polling**: Polls temperature data from a list of known Satellites and reads local sensor.
    
- **Logic**: Executes the Thermostat Control Algorithm (see 4.3).
    
- **Web Server**: Runs `microdot` at `/api` and serves `/app`.
    

#### Satellite Mode

- Connects to WiFi.
    
- Reads local DHT22 sensor.
    
- Exposes current temperature via `GET /api/readings` for the Host to poll.
    

### 4.2 Networking & Pairing

- **Pairing Mode**:
    
    - Creates a WiFi Access Point (AP) named `PicoThermostat_XXXX`.
        
    - User connects and provisions WiFi credentials via a simple web page.
        
    - Credentials saved to `secrets.json`.
        
- **Normal Operation**:
    
    - Connects to saved WiFi with credentials from `secrets.json`.
        

### 4.3 Thermostat Control Algorithm

The Host decides relay state based on aggregated sensor data.

**Definitions:**

- `active_sensors`: List of valid temperature readings from online sources (Satellites + Local).
    
- `read_temp`: The calculated current temperature based on configuration.
    
- `hysteresis`: Buffer to prevent short-cycling.
    

**Logic Flow:**

1. **Filter Sensors**:
    
    - Exclude Satellites marked `online: false`.
        
    - **Sanity Check**: Ignore local/satellite readings that are `NaN` or unrealistic (e.g., -40°C or >80°C).
        
    - **Local Sensor Rule**:
        
        - If `config.local_sensor == "included"`: Always include local DHT22 in `active_sensors`.
            
        - If `config.local_sensor == "fallback"`: Include local DHT22 _only if_ no Satellites are online.
            
2. **Calculate `read_temp`**:
    
    - If `mode == "average"`: `read_temp = sum(active_sensors) / count(active_sensors)`
        
    - If `mode == "all"`: Treat sensors individually (logic below).
        
3. **Determine Action**:
    
    - **Turn Flame ON** if:
        
        - (`flame_on_mode == "average"`) AND (`read_temp < target_temp - hysteresis`)
            
        - (`flame_on_mode == "all"`) AND (ALL `active_sensors` are `< target_temp - hysteresis`)
            
    - **Turn Flame OFF** if:
        
        - **Safety**: `flame_duration > max_flame_duration` (Force Cooldown).
            
        - (`flame_off_mode == "average"`) AND (`read_temp > target_temp + hysteresis`)
            
        - (`flame_off_mode == "all"`) AND (ALL `active_sensors` are `> target_temp + hysteresis`)
            

## 5. Software Architecture

### 5.1 Endpoints

- `GET /api/status`: Returns current state (Host).
    
- `GET /api/readings`: Returns current sensor data `{temperature, humidity}` (Satellite).
    
- `GET /api/config`: Fetch config.
    
- `POST /api/config`: Update config.
    
- `PATCH /api/config`: Partially update config.
    

### 5.2 Libraries

- `microdot`
    
- `picozero`
    

### 5.3 Data Structures

**Secrets** (`secrets.json`)

```
{
    "ssid": "Network Name",
    "password": "network password"
}
```

**Config** (`config.json`)

```
{
    "mode": "host", // "host" or "satellite"
    "target_temp": 22.0,
    "hysteresis": 1.0,
    "satellites": ["192.168.1.5", "192.168.1.6"],
    "update_interval": 4, // Seconds
    "satellite_grace_period": 120, // Seconds
    "led_brightness": 1.0,
    
    // Logic Configuration
    "flame_on_mode": "average", // "average" or "all"
    "flame_off_mode": "average", // "average" or "all"
    "local_sensor": "included", // "included" or "fallback"
    
    // Safety
    "max_flame_duration": 14400 // Seconds (4 hours)
}
```

**State** (Runtime Object)

```
{
    "config": { /* The config object */ },
    "is_pairing": false,
    "sensor": {
        "temperature": 19.5,
        "humidity": 45.0
    },
    "flame": true,
    "flame_start_tick": 120300, // System tick when flame started (for max duration check)
    "satellites": [
        {
            "ip": "192.168.1.5",
            "sensor": {
                "temperature": 20.5,
                "humidity": 44.7
            },
            "last_updated": 230500, // System tick (monotonic)
            "online": true
        }
    ]
}
```

### 5.4 Software Components

- **State Manager**: SSoT.
    
- **Sensor Manager**: Polls local DHT22; applies sanity checks (filters NaN/outliers).
    
- **LED Manager**: Determines color based on Priority Hierarchy (Pairing > Wifi Error > Flame > Idle).
    
- **Relay Manager**: Controls GP15; enforces `max_flame_duration` safety cutoff.
    
- **Button Manager**: Handles pairing toggle.
    
- **Satellite Manager**: Polls satellite IPs; manages `online` status based on `last_updated` ticks vs `grace_period`.
    
- **Pairing Manager**: Manages AP and secrets.
    
- **Config Manager**: JSON I/O. Updates the State when configuration changes.
    
- **Thermostat**: Implements logic from Section 4.3 using `flame_on_mode`/`flame_off_mode`.
    

## 6. UX / Web Interface

The system serves two distinct web interfaces, written in React in the /app folder. Both are lightweight Single Page Applications (SPAs).

### 6.1 Captive Portal (Pairing Mode)

Served when the device is in AP mode (Blue LED).

- **Goal**: Provision WiFi credentials.
    
- **Features**:
    
    - Scans for available networks (optional, or manual entry).
        
    - Form inputs for SSID and Password.
        
    - "Connect" button that posts credentials to the device.
        
    - Success message upon saving secrets.
        

### 6.2 Host Application (Normal Operation)

Served when the device is in Host mode and connected to WiFi (Green/Red LED).

- **Goal**: Monitor and control the thermostat.
    
- **Features**:
    
    - **Dashboard**:
        
        - Displays Current Temperature (Large).
            
        - Displays Target Temperature with +/- controls.
            
        - Status Indicator: Heating (Flame icon) vs Idle.
            
        - Humidity display.
            
    - **Settings Panel**:
        
        - List of Satellites (IPs and Status).
            
        - Logic Configuration (Hysteresis, Flame On/Off modes).
            
        - Configurable timers (Grace period, Max flame duration).
            
    - **Satellite View**: If accessed on a Satellite node, displays a read-only view of its local sensor data.