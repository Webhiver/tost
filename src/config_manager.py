import json

DEFAULT_CONFIG = {
    "mode": "host",
    "target_temp": 22.0,
    "hysteresis": 1.0,
    "satellites": [],
    "update_interval": 4,
    "satellite_grace_period": 120,
    "led_brightness": 1.0,
    "flame_on_mode": "average",
    "flame_off_mode": "average",
    "local_sensor": "included",
    "max_flame_duration": 14400
}

CONFIG_FILE = "config.json"


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
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)


def update(updates):
    config = load()
    config.update(updates)
    save(config)
    return config
