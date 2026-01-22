from state import state
from config import config


class TemperatureCalculator:
    
    def __init__(self):
        # Subscribe to state changes
        state.subscribe("sensor", self._on_change)
        state.subscribe("satellites", self._on_change)
        state.subscribe("flame", self._on_change)
        
        # Subscribe to config changes
        config.subscribe("mode", self._on_change)
        config.subscribe("flame_mode", self._on_change)
        config.subscribe("flame_mode_sensor", self._on_change)
        config.subscribe("local_sensor", self._on_change)
        config.subscribe("satellite_grace_period", self._on_change)
    
    def _on_change(self, new_val, old_val):
        self.update()
    
    def _is_valid_temp(self, temp):
        """Check if temperature is a valid reading."""
        if temp is None:
            return False
        try:
            # NaN check
            if temp != temp:
                return False
            # Reasonable range check
            if temp < -40 or temp > 80:
                return False
            return True
        except (TypeError, ValueError):
            return False
    
    def _get_local_temperature(self):
        """Get local sensor temperature if valid and healthy."""
        sensor_data = state.get("sensor", {})
        if not sensor_data.get("healthy", False):
            return None
        temp = sensor_data.get("temperature")
        if self._is_valid_temp(temp):
            return temp
        return None
    
    def _get_satellite_temperatures(self):
        """Get list of valid temperatures from online, healthy satellites."""
        temps = []
        satellites = state.get("satellites", [])
        
        for sat in satellites:
            # Check if satellite is online
            if not sat.get("online", False):
                continue
            
            # Get satellite state and sensor data
            sat_state = sat.get("state") or {}
            sat_sensor = sat_state.get("sensor") or {}
            
            # Check if satellite sensor is healthy
            if not sat_sensor.get("healthy", False):
                continue
            
            temp = sat_sensor.get("temperature")
            if self._is_valid_temp(temp):
                temps.append(temp)
        
        return temps
    
    def _get_sensor_by_ip(self, ip):
        """Get temperature from a specific satellite by IP."""
        satellites = state.get("satellites", [])
        
        for sat in satellites:
            if sat.get("ip") == ip:
                if not sat.get("online", False):
                    return None
                
                sat_state = sat.get("state") or {}
                sat_sensor = sat_state.get("sensor") or {}
                
                if not sat_sensor.get("healthy", False):
                    return None
                
                temp = sat_sensor.get("temperature")
                if self._is_valid_temp(temp):
                    return temp
                return None
        
        return None
    
    def _collect_temperatures(self):
        """Collect all valid temperatures based on local_sensor setting."""
        local_sensor_rule = config.get("local_sensor", "included")
        satellite_temps = self._get_satellite_temperatures()
        local_temp = self._get_local_temperature()
        
        temps = []
        
        if local_sensor_rule == "included":
            if local_temp is not None:
                temps.append(local_temp)
        elif local_sensor_rule == "fallback":
            # Only use local if no satellites available
            if len(satellite_temps) == 0 and local_temp is not None:
                temps.append(local_temp)
        
        temps.extend(satellite_temps)
        return temps
    
    def calculate(self):
        """Calculate effective temperature based on flame_mode."""
        # Only calculate for host mode
        if config.get("mode") != "host":
            return None
        
        flame_mode = config.get("flame_mode", "average")
        flame = state.get("flame", False)
        
        if flame_mode == "one":
            # Use specific sensor
            sensor_id = config.get("flame_mode_sensor", "local")
            if sensor_id == "local":
                return self._get_local_temperature()
            else:
                # Try satellite, fallback to local if unavailable
                sat_temp = self._get_sensor_by_ip(sensor_id)
                if sat_temp is not None:
                    return sat_temp
                return self._get_local_temperature()
        
        # For other modes, collect all temperatures
        temps = self._collect_temperatures()
        
        if not temps:
            return None
        
        if flame_mode == "average":
            return sum(temps) / len(temps)
        
        elif flame_mode == "all":
            # If flame is off, use max (hardest to turn on)
            # If flame is on, use min (hardest to turn off)
            if flame:
                return min(temps)
            else:
                return max(temps)
        
        elif flame_mode == "any":
            # Always use min (easiest to turn on/stay on)
            return min(temps)
        
        # Fallback to average
        return sum(temps) / len(temps)
    
    def update(self):
        """Update effective_temperature in state."""
        effective_temp = self.calculate()
        state.set("effective_temperature", effective_temp)


# Singleton instance
temperature = TemperatureCalculator()
