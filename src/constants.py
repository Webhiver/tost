# Default values (breadboard-dht baseline)
from hw_revision import HW_REVISION

# Hardware pin configuration
PIN_LED_RED = 13
PIN_LED_GREEN = 12
PIN_LED_BLUE = 11
PIN_DHT = 28
PIN_RELAY = 16
PIN_BUTTON = 1
PIN_SHT_SCL = 27
PIN_SHT_SDA = 26

# Sensor type
SENSOR_TYPE = "DHT"

# Network configuration
AP_IP = "192.168.4.1"
AP_SUBNET = "255.255.255.0"
SATELLITE_POLLING_INTERVAL = 5
DISCOVERY_PORT = 5005

# Button configuration
PAIRING_LONG_PRESS_MS = 2000
SHORT_PRESS_MIN_MS = 50      # Minimum press duration (debounce)
SHORT_PRESS_MAX_MS = 500     # Maximum press duration for short press

# Revision-based overrides
if HW_REVISION == "breadboard-dht":
    pass

elif HW_REVISION == "case-dht":
    PIN_BUTTON = 22
    PIN_RELAY = 6

elif HW_REVISION == "breadboard-sht":
    SENSOR_TYPE = "SHT"

elif HW_REVISION == "case-sht":
    PIN_BUTTON = 22
    PIN_RELAY = 6
    SENSOR_TYPE = "SHT"
