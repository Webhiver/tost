import asyncio
from time import ticks_ms


class Thermostat:
    
    def __init__(self, state_manager):
        self._state = state_manager
    
    def get_active_sensors(self):
        active = []
        config = self._state.get("config", {})
        
        satellite_temps = []
        satellites = self._state.get("satellites", [])
        for sat in satellites:
            if sat.get("online") and self._is_valid_temp(sat.get("sensor", {}).get("temperature")):
                satellite_temps.append(sat["sensor"]["temperature"])
        
        local_sensor_rule = config.get("local_sensor", "included")
        sensor_data = self._state.get("sensor", {})
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
        flame_start_tick = self._state.get("flame_start_tick")
        if not self._state.get("flame") or flame_start_tick is None:
            return 0
        
        current_tick = ticks_ms()
        elapsed = current_tick - flame_start_tick
        
        if elapsed < 0:
            elapsed = current_tick + (0xFFFFFFFF - flame_start_tick)
        
        return elapsed / 1000
    
    def should_turn_flame_on(self, active_sensors):
        if not active_sensors:
            return False
        
        config = self._state.get("config", {})
        target_temp = config.get("target_temp", 22.0)
        hysteresis = config.get("hysteresis", 1.0)
        flame_on_mode = config.get("flame_on_mode", "average")
        
        threshold = target_temp - hysteresis
        
        if flame_on_mode == "average":
            read_temp = self.calculate_read_temp(active_sensors, "average")
            return read_temp < threshold
        else:
            return all(temp < threshold for temp in active_sensors)
    
    def should_turn_flame_off(self, active_sensors):
        config = self._state.get("config", {})
        target_temp = config.get("target_temp", 22.0)
        hysteresis = config.get("hysteresis", 1.0)
        flame_off_mode = config.get("flame_off_mode", "average")
        max_flame_duration = config.get("max_flame_duration", 14400)
        
        if self.get_flame_duration() > max_flame_duration:
            return True
        
        if not active_sensors:
            return False
        
        threshold = target_temp + hysteresis
        
        if flame_off_mode == "average":
            read_temp = self.calculate_read_temp(active_sensors, "average")
            return read_temp > threshold
        else:
            return all(temp > threshold for temp in active_sensors)
    
    def update(self):
        active_sensors = self.get_active_sensors()
        current_flame = self._state.get("flame", False)
        
        if current_flame:
            if self.should_turn_flame_off(active_sensors):
                self._state.set("flame", False)
        else:
            if self.should_turn_flame_on(active_sensors):
                self._state.set("flame", True)
        
        return self._state.get("flame", False)
    
    def get_diagnostics(self):
        active_sensors = self.get_active_sensors()
        config = self._state.get("config", {})
        
        avg_temp = None
        if active_sensors:
            avg_temp = sum(active_sensors) / len(active_sensors)
        
        return {
            "active_sensors_count": len(active_sensors),
            "active_sensor_temps": active_sensors,
            "average_temp": avg_temp,
            "target_temp": config.get("target_temp"),
            "hysteresis": config.get("hysteresis"),
            "flame": self._state.get("flame"),
            "flame_duration": self.get_flame_duration(),
            "max_flame_duration": config.get("max_flame_duration"),
            "flame_on_mode": config.get("flame_on_mode"),
            "flame_off_mode": config.get("flame_off_mode"),
            "local_sensor_rule": config.get("local_sensor")
        }

    async def loop(self):
        while True:
            config = self._state.get("config", {})
            if config.get("mode") == "host" and not self._state.get("is_pairing"):
                self.update()
            await asyncio.sleep(1)
