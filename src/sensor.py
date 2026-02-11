import asyncio
import time
from machine import Pin, I2C
import constants
from state import state
from config import config

# SHT4X I2C constants
_SHT4X_ADDR = const(0x44)
_SHT4X_CMD_MEASURE_HIGH = const(0xFD)
_SHT4X_MEASURE_WAIT_MS = const(10)
_SHT4X_CRC_POLY = const(0x31)
_SHT4X_CRC_INIT = const(0xFF)


def _sht4x_crc(data):
    """Compute CRC-8 checksum per Sensirion spec."""
    crc = _SHT4X_CRC_INIT
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x80:
                crc = (crc << 1) ^ _SHT4X_CRC_POLY
            else:
                crc = crc << 1
    return crc & 0xFF


class SensorManager:
    
    MIN_TEMP = -40.0
    MAX_TEMP = 80.0
    MIN_HUMIDITY = 0.0
    MAX_HUMIDITY = 100.0
    
    def __init__(self):
        self._sensor_type = constants.SENSOR_TYPE
        print(f"[sensor] Using {self._sensor_type} sensor")
        if self._sensor_type == "SHT":
            self._i2c = I2C(1,
                            scl=Pin(constants.PIN_SHT_SCL),
                            sda=Pin(constants.PIN_SHT_SDA),
                            freq=100000)
        else:
            import dht
            self._sensor = dht.DHT22(Pin(constants.PIN_DHT, Pin.IN, Pin.PULL_UP))
        self._last_temp = None
        self._last_humidity = None
    
    def _read_dht(self):
        """Read temperature and humidity from DHT22 sensor."""
        import dht  # already imported at init, but guard for clarity
        self._sensor.measure()
        return self._sensor.temperature(), self._sensor.humidity()
    
    def _read_sht(self):
        """Read temperature and humidity from SHT4X sensor over I2C."""
        self._i2c.writeto(_SHT4X_ADDR, bytes([_SHT4X_CMD_MEASURE_HIGH]))
        time.sleep_ms(_SHT4X_MEASURE_WAIT_MS)
        buf = self._i2c.readfrom(_SHT4X_ADDR, 6)
        
        # Verify CRC for temperature bytes
        if _sht4x_crc(buf[0:2]) != buf[2]:
            raise OSError("SHT4X temperature CRC mismatch")
        # Verify CRC for humidity bytes
        if _sht4x_crc(buf[3:5]) != buf[5]:
            raise OSError("SHT4X humidity CRC mismatch")
        
        t_ticks = buf[0] * 256 + buf[1]
        rh_ticks = buf[3] * 256 + buf[4]
        
        temp = -45.0 + 175.0 * t_ticks / 65535.0
        humidity = -6.0 + 125.0 * rh_ticks / 65535.0
        
        return temp, humidity
    
    def read(self):
        try:
            if self._sensor_type == "SHT":
                temp, humidity = self._read_sht()
            else:
                temp, humidity = self._read_dht()
            
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
