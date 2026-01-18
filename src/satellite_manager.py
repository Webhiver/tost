import asyncio
import urequests
from time import ticks_ms


class SatelliteManager:
    
    TIMEOUT_MS = 5000
    
    def __init__(self, state_manager):
        self._state = state_manager
        self._sync_satellites_from_config()
        self._state.subscribe("config", self._on_config_change)
    
    def _on_config_change(self, new_config, old_config):
        new_sats = new_config.get("satellites", [])
        old_sats = old_config.get("satellites", []) if old_config else []
        if new_sats != old_sats:
            self._sync_satellites_from_config()
    
    def _sync_satellites_from_config(self):
        """Sync config.satellites (objects with ip/name) to state.satellites (full objects)"""
        config = self._state.get("config", {})
        config_sats = config.get("satellites", [])
        current_satellites = self._state.get("satellites", [])
        current_by_ip = {sat["ip"]: sat for sat in current_satellites}
        
        updated_satellites = []
        for sat_config in config_sats:
            ip = sat_config.get("ip", "")
            name = sat_config.get("name", "")
            
            if ip in current_by_ip:
                existing = current_by_ip[ip]
                existing["name"] = name  # Always update name from config
                updated_satellites.append(existing)
            else:
                updated_satellites.append({
                    "ip": ip,
                    "name": name,
                    "sensor": {"temperature": None, "humidity": None},
                    "last_updated": None,
                    "online": False
                })
        
        self._state.set("satellites", updated_satellites)
    
    def poll_satellite_sync(self, ip):
        try:
            url = "http://{}:80/api/readings".format(ip)
            response = urequests.get(url, timeout=self.TIMEOUT_MS / 1000)
            
            if response.status_code == 200:
                data = response.json()
                temp = data.get("temperature")
                humidity = data.get("humidity")
                response.close()
                
                if self._is_valid_reading(temp, humidity):
                    return temp, humidity
            else:
                response.close()
            
            return None, None
            
        except Exception:
            return None, None
    
    def _is_valid_reading(self, temp, humidity):
        if temp is None or humidity is None:
            return False
        
        try:
            if temp != temp or humidity != humidity:
                return False
            
            if temp < -40 or temp > 80:
                return False
            if humidity < 0 or humidity > 100:
                return False
            
            return True
        except (TypeError, ValueError):
            return False
    
    def poll_all_satellites(self):
        satellites = self._state.get("satellites", [])
        current_tick = ticks_ms()
        config = self._state.get("config", {})
        grace_period_ms = config.get("satellite_grace_period", 120) * 1000
        
        updated_satellites = []
        
        for sat in satellites:
            ip = sat["ip"]
            name = sat.get("name", "")
            temp, humidity = self.poll_satellite_sync(ip)
            
            if temp is not None and humidity is not None:
                updated_satellites.append({
                    "ip": ip,
                    "name": name,
                    "sensor": {"temperature": temp, "humidity": humidity},
                    "last_updated": current_tick,
                    "online": True
                })
            else:
                last_updated = sat.get("last_updated")
                online = False
                
                if last_updated is not None:
                    elapsed = current_tick - last_updated
                    if elapsed < 0:
                        elapsed = current_tick + (0xFFFFFFFF - last_updated)
                    online = elapsed <= grace_period_ms
                
                updated_satellites.append({
                    "ip": ip,
                    "name": name,
                    "sensor": sat.get("sensor", {"temperature": None, "humidity": None}),
                    "last_updated": last_updated,
                    "online": online
                })
        
        self._state.set("satellites", updated_satellites)

    async def loop(self):
        while True:
            config = self._state.get("config", {})
            if config.get("mode") == "host" and not self._state.get("is_pairing"):
                self.poll_all_satellites()
            interval = config.get("update_interval", 4)
            await asyncio.sleep(interval)
