from time import ticks_ms
from state_manager import state
from config_manager import config


class Thermostat:
    
    def __init__(self):
        state.subscribe("sensor", self._on_sensor_change)
        state.subscribe("satellites", self._on_satellites_change)
        config.subscribe("mode", self._on_mode_change)
        config.subscribe("target_temp", self._on_config_change)
        config.subscribe("hysteresis", self._on_config_change)
        config.subscribe("flame_on_mode", self._on_config_change)
        config.subscribe("flame_off_mode", self._on_config_change)
        config.subscribe("local_sensor", self._on_config_change)
        config.subscribe("max_flame_duration", self._on_config_change)
    
    def _is_active(self):
        return config.get("mode") == "host" and not state.get("is_pairing")
    
    def _on_sensor_change(self, new_val, old_val):
        if self._is_active():
            self.update()
    
    def _on_satellites_change(self, new_val, old_val):
        if self._is_active():
            self.update()
    
    def _on_mode_change(self, new_mode, old_mode):
        if new_mode == "host":
            self.update(ignore_hysteresis=True)
        elif old_mode == "host":
            # Switching away from host mode - turn off flame
            state.set("flame", False)
    
    def _on_config_change(self, new_val, old_val):
        if self._is_active():
            self.update(ignore_hysteresis=True)
    
    def get_active_sensors(self):
        active = []
        
        satellite_temps = []
        satellites = state.get("satellites", [])
        for sat in satellites:
            if sat.get("online") and self._is_valid_temp(sat.get("sensor", {}).get("temperature")):
                satellite_temps.append(sat["sensor"]["temperature"])
        
        local_sensor_rule = config.get("local_sensor", "included")
        sensor_data = state.get("sensor", {})
        local_temp = sensor_data.get("temperature")
        
        if local_sensor_rule == "included":
            if self._is_valid_temp(local_temp):
                active.append(local_temp)
        elif local_sensor_rule == "fallback":
            if len(satellite_temps) == 0 and self._is_valid_temp(local_temp):
                active.append(local_temp)
        
        active.extend(satellite_temps)
        
        return active
    
    def _is_valid_temp(self, temp):
        if temp is None:
            return False
        try:
            if temp != temp:
                return False
            if temp < -40 or temp > 80:
                return False
            return True
        except (TypeError, ValueError):
            return False
    
    def calculate_read_temp(self, active_sensors, mode):
        if not active_sensors:
            return None
        
        if mode == "average":
            return sum(active_sensors) / len(active_sensors)
        else:
            return active_sensors
    
    def get_flame_duration(self):
        flame_start_tick = state.get("flame_start_tick")
        if not state.get("flame") or flame_start_tick is None:
            return 0
        
        current_tick = ticks_ms()
        elapsed = current_tick - flame_start_tick
        
        if elapsed < 0:
            elapsed = current_tick + (0xFFFFFFFF - flame_start_tick)
        
        return elapsed / 1000
    
    def should_turn_flame_on(self, active_sensors, ignore_hysteresis=False):
        if not active_sensors:
            return False
        
        target_temp = config.get("target_temp", 22.0)
        hysteresis = 0 if ignore_hysteresis else config.get("hysteresis", 1.0)
        flame_on_mode = config.get("flame_on_mode", "average")
        
        threshold = target_temp - hysteresis
        
        if flame_on_mode == "average":
            read_temp = self.calculate_read_temp(active_sensors, "average")
            return read_temp < threshold
        else:
            return all(temp < threshold for temp in active_sensors)
    
    def should_turn_flame_off(self, active_sensors, ignore_hysteresis=False):
        target_temp = config.get("target_temp", 22.0)
        hysteresis = 0 if ignore_hysteresis else config.get("hysteresis", 1.0)
        flame_off_mode = config.get("flame_off_mode", "average")
        max_flame_duration = config.get("max_flame_duration", 14400)
        
        if self.get_flame_duration() > max_flame_duration:
            return True
        
        if not active_sensors:
            return False
        
        threshold = target_temp + hysteresis
        
        if flame_off_mode == "average":
            read_temp = self.calculate_read_temp(active_sensors, "average")
            return read_temp >= threshold
        else:
            return all(temp >= threshold for temp in active_sensors)
    
    def update(self, ignore_hysteresis=False):
        active_sensors = self.get_active_sensors()
        current_flame = state.get("flame", False)
        
        if current_flame:
            if self.should_turn_flame_off(active_sensors, ignore_hysteresis):
                state.set("flame", False)
        else:
            if self.should_turn_flame_on(active_sensors, ignore_hysteresis):
                state.set("flame", True)
        
        state.set("flame_duration", self.get_flame_duration())
        
        return state.get("flame", False)
    
    def get_diagnostics(self):
        active_sensors = self.get_active_sensors()
        
        avg_temp = None
        if active_sensors:
            avg_temp = sum(active_sensors) / len(active_sensors)
        
        return {
            "active_sensors_count": len(active_sensors),
            "active_sensor_temps": active_sensors,
            "average_temp": avg_temp,
            "target_temp": config.get("target_temp"),
            "hysteresis": config.get("hysteresis"),
            "flame": state.get("flame"),
            "flame_duration": self.get_flame_duration(),
            "max_flame_duration": config.get("max_flame_duration"),
            "flame_on_mode": config.get("flame_on_mode"),
            "flame_off_mode": config.get("flame_off_mode"),
            "local_sensor_rule": config.get("local_sensor")
        }


thermostat = Thermostat()
