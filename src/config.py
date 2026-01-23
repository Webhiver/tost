import json

DEFAULT_CONFIG = {
    "mode": "host",
    "operating_mode": "manual",
    "target_temperature": 22.0,
    "hysteresis": 1.0,
    "satellites": [],
    "satellite_grace_period": 120,
    "led_brightness": 1.0,
    "flame_mode": "average",
    "flame_mode_sensor": "local",
    "local_sensor": "included",
    "max_flame_duration": 14400,
    "sensor_temperature_offset": 0.0,
    "sensor_humidity_offset": 0.0
}


def is_valid_ip(ip):
    """Validate IPv4 address format."""
    if not ip or not isinstance(ip, str):
        return False
    parts = ip.split(".")
    if len(parts) != 4:
        return False
    for part in parts:
        try:
            num = int(part)
            if num < 0 or num > 255:
                return False
            # Reject leading zeros (e.g., "01" or "001")
            if part != str(num):
                return False
        except ValueError:
            return False
    return True


def _sanitize_satellites(satellites):
    """Filter out satellites with invalid IPs."""
    if not isinstance(satellites, list):
        return []
    valid = []
    for sat in satellites:
        if isinstance(sat, dict) and is_valid_ip(sat.get("ip", "")):
            valid.append(sat)
    return valid

# Keys that must be numeric (int or float) - None values will be replaced with defaults
NUMERIC_KEYS = {
    "target_temperature", "hysteresis", "satellite_grace_period", "led_brightness",
    "max_flame_duration", "sensor_temperature_offset", "sensor_humidity_offset"
}

CONFIG_FILE = "config.json"


def _sanitize_config(config):
    """Replace None values for numeric keys with their defaults."""
    for key in NUMERIC_KEYS:
        if key in config and config[key] is None:
            config[key] = DEFAULT_CONFIG.get(key, 0)
    return config


def _load_from_file():
    try:
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            merged = DEFAULT_CONFIG.copy()
            merged.update(config)
            return merged
    except (OSError, ValueError):
        return DEFAULT_CONFIG.copy()


def _save_to_file(config):
    config = _sanitize_config(config)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f)


class ConfigManager:
    
    def __init__(self, initial_config=None):
        self._config = initial_config or _load_from_file()
        self._subscribers = {}
    
    def get(self, key, default=None):
        return self._config.get(key, default)
    
    def set(self, key, value):
        # Validate satellites before saving
        if key == "satellites":
            value = _sanitize_satellites(value)
        
        old_value = self._config.get(key)
        self._config[key] = value
        
        if old_value != value:
            self._notify(key, value, old_value)
            self._save()
    
    def update(self, key, updates):
        current = self._config.get(key, {})
        if isinstance(current, dict) and isinstance(updates, dict):
            old_value = current.copy()
            current.update(updates)
            self._config[key] = current
            self._notify(key, current, old_value)
        else:
            self.set(key, updates)
            return
        self._save()
    
    def subscribe(self, key, callback):
        if key not in self._subscribers:
            self._subscribers[key] = []
        
        self._subscribers[key].append(callback)
        
        def unsubscribe():
            if callback in self._subscribers.get(key, []):
                self._subscribers[key].remove(callback)
        
        return unsubscribe
    
    def _notify(self, key, new_value, old_value):
        for callback in self._subscribers.get(key, []):
            try:
                callback(new_value, old_value)
            except Exception as e:
                print("Config subscriber error:", e)
    
    def get_all(self):
        return self._config.copy()
    
    def set_all(self, new_config):
        # Validate satellites before saving
        if "satellites" in new_config:
            new_config["satellites"] = _sanitize_satellites(new_config["satellites"])
        
        old_config = self._config.copy()
        self._config = new_config
        
        all_keys = set(old_config.keys()) | set(new_config.keys())
        for key in all_keys:
            old_val = old_config.get(key)
            new_val = new_config.get(key)
            if old_val != new_val:
                self._notify(key, new_val, old_val)
        
        self._save()
    
    def update_all(self, updates):
        """Update multiple config keys at once."""
        # Validate satellites before saving
        if "satellites" in updates:
            updates["satellites"] = _sanitize_satellites(updates["satellites"])
        
        old_config = self._config.copy()
        self._config.update(updates)
        
        for key in updates.keys():
            old_val = old_config.get(key)
            new_val = updates.get(key)
            if old_val != new_val:
                self._notify(key, new_val, old_val)
        
        self._save()
    
    def _save(self):
        _save_to_file(self._config)


# Singleton instance
config = ConfigManager()
