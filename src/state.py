try:
    from version import VERSION
except ImportError:
    VERSION = "0.0.0"


class StateManager:

    def __init__(self, initial_state=None):
        self._state = initial_state or {}
        self._subscribers = {}

    def get(self, key, default=None):
        return self._state.get(key, default)

    def set(self, key, value):
        old_value = self._state.get(key)
        self._state[key] = value

        if old_value != value:
            self._notify(key, value, old_value)

    def update(self, key, updates):
        current = self._state.get(key, {})
        if isinstance(current, dict) and isinstance(updates, dict):
            old_value = current.copy()
            current.update(updates)
            self._state[key] = current
            self._notify(key, current, old_value)
        else:
            self.set(key, updates)

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
                print("State subscriber error:", e)

    def get_all(self):
        return self._state.copy()

    def set_all(self, state):
        old_state = self._state.copy()
        self._state = state

        all_keys = set(old_state.keys()) | set(state.keys())
        for key in all_keys:
            old_val = old_state.get(key)
            new_val = state.get(key)
            if old_val != new_val:
                self._notify(key, new_val, old_val)

    def get_satellite_state(self):
        """Get trimmed state for satellites (only firmware_version, sensor and wifi_strength)."""
        return {
            "sensor": self._state.get("sensor"),
            "wifi_strength": self._state.get("wifi_strength"),
            "firmware_version": self._state.get("firmware_version"),
            "firmware_update_available": self._state.get("firmware_update_available"),
        }

    def get_satellite_by_mac(self, mac):
        """Find a satellite in state by its MAC address."""
        satellites = self._state.get("satellites", [])
        mac_lower = mac.lower() if mac else ""
        for sat in satellites:
            if sat.get("mac", "").lower() == mac_lower:
                return sat
        return None


state = StateManager({
    "is_pairing": False,
    "wifi_connected": False,
    "wifi_strength": None,
    "mac": None,
    "ip": None,
    "firmware_version": VERSION,
    "firmware_update_available": False,
    "sensor": {
        "temperature": None,
        "humidity": None,
        "healthy": False,
        "message": "Initializing..."
    },
    "flame": False,
    "flame_start_tick": None,
    "flame_cooldown_start_tick": None,
    "flame_duration": 0,
    "satellites": [],
    "effective_temperature": None
})
