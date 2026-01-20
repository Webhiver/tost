import asyncio
from machine import Pin
import dht
import hardware_config
from state_manager import state
from config_manager import config


class SensorManager:
    
    MIN_TEMP = -40.0
    MAX_TEMP = 80.0
    MIN_HUMIDITY = 0.0
    MAX_HUMIDITY = 100.0
    
    def __init__(self):
        self._sensor = dht.DHT22(Pin(hardware_config.PIN_DHT))
        self._last_temp = None
        self._last_humidity = None
    
    def read(self):
        try:
            self._sensor.measure()
            temp = self._sensor.temperature()
            humidity = self._sensor.humidity()
            
            temp_valid = self._is_valid_temp(temp)
            humidity_valid = self._is_valid_humidity(humidity)
            
            if not temp_valid:
                temp = None
            if not humidity_valid:
                humidity = None
            
            # Apply offsets from config
            if temp is not None:
                temp_offset = config.get("sensor_temperature_offset", 0.0)
                temp = round(temp + temp_offset, 1)
            if humidity is not None:
                humidity_offset = config.get("sensor_humidity_offset", 0.0)
                humidity = round(humidity + humidity_offset, 1)
                # Clamp humidity to valid range after offset
                humidity = max(self.MIN_HUMIDITY, min(self.MAX_HUMIDITY, humidity))
            
            self._last_temp = temp
            self._last_humidity = humidity
            
            # Determine health status
            if temp is None and humidity is None:
                return temp, humidity, False, "No valid readings"
            elif temp is None:
                return temp, humidity, False, "Invalid temperature"
            elif humidity is None:
                return temp, humidity, False, "Invalid humidity"
            else:
                return temp, humidity, True, ""
            
        except OSError as e:
            return None, None, False, "Sensor read error"
    
    def _is_valid_temp(self, temp):
        if temp is None:
            return False
        try:
            if temp != temp:
                return False
            return self.MIN_TEMP <= temp <= self.MAX_TEMP
        except (TypeError, ValueError):
            return False
    
    def _is_valid_humidity(self, humidity):
        if humidity is None:
            return False
        try:
            if humidity != humidity:
                return False
            return self.MIN_HUMIDITY <= humidity <= self.MAX_HUMIDITY
        except (TypeError, ValueError):
            return False
    
    @property
    def last_temperature(self):
        return self._last_temp
    
    @property
    def last_humidity(self):
        return self._last_humidity

    async def loop(self):
        while True:
            temp, humidity, healthy, message = self.read()
            state.set("sensor", {
                "temperature": temp,
                "humidity": humidity,
                "healthy": healthy,
                "message": message
            })
            await asyncio.sleep(2)


sensor = SensorManager()
