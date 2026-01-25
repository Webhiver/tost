# Default values - can be overridden by env.py

# Hardware pin configuration
PIN_LED_RED = 13
PIN_LED_GREEN = 12
PIN_LED_BLUE = 11
PIN_DHT = 28
PIN_RELAY = 16
PIN_BUTTON = 1

# Network configuration
AP_IP = "192.168.4.1"
AP_SUBNET = "255.255.255.0"
SATELLITE_POLLING_INTERVAL = 5
DISCOVERY_PORT = 5005

# Button configuration
PAIRING_LONG_PRESS_MS = 2000
SHORT_PRESS_MIN_MS = 50      # Minimum press duration (debounce)
SHORT_PRESS_MAX_MS = 500     # Maximum press duration for short press

# Load overrides from env.py if it exists
try:
    from env import *
except ImportError:
    pass
