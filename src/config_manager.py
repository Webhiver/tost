import json

DEFAULT_CONFIG = {
    "mode": "host",
    "target_temp": 22.0,
    "hysteresis": 1.0,
    "satellites": [],
    "satellite_grace_period": 120,
    "led_brightness": 1.0,
    "flame_on_mode": "average",
    "flame_off_mode": "average",
    "local_sensor": "included",
    "max_flame_duration": 14400,
    "sensor_temperature_offset": 0.0,
    "sensor_humidity_offset": 0.0
}

# Keys that must be numeric (int or float) - None values will be replaced with defaults
NUMERIC_KEYS = {
    "target_temp", "hysteresis", "satellite_grace_period", "led_brightness",
    "max_flame_duration", "sensor_temperature_offset", "sensor_humidity_offset"
}

CONFIG_FILE = "config.json"


def _sanitize_config(config):
    """Replace None values for numeric keys with their defaults."""
    for key in NUMERIC_KEYS:
        if key in config and config[key] is None:
            config[key] = DEFAULT_CONFIG.get(key, 0)
    return config


def load():
    try:
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            merged = DEFAULT_CONFIG.copy()
            merged.update(config)
            return merged
    except (OSError, ValueError):
        return DEFAULT_CONFIG.copy()


def save(config):
    config = _sanitize_config(config)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)


def update(updates):
    config = load()
    config.update(updates)
    save(config)
    return config
