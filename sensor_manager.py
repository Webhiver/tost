import asyncio
from machine import Pin
import dht
import hardware_config
from state_manager import state


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
            
            if not self._is_valid_temp(temp):
                temp = None
            if not self._is_valid_humidity(humidity):
                humidity = None
            
            self._last_temp = temp
            self._last_humidity = humidity
            
            return temp, humidity
            
        except OSError:
            return None, None
    
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
            temp, humidity = self.read()
            state.set("sensor", {"temperature": temp, "humidity": humidity})
            await asyncio.sleep(2)


sensor = SensorManager()
