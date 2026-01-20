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


state = StateManager({
    "is_pairing": False,
    "wifi_connected": False,
    "wifi_strength": None,
    "sensor": {
        "temperature": None,
        "humidity": None,
        "healthy": False,
        "message": "Initializing..."
    },
    "flame": False,
    "flame_start_tick": None,
    "flame_duration": 0,
    "satellites": []
})
