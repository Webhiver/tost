import asyncio
import json
from time import ticks_ms
from network_config import SATELLITE_POLLING_INTERVAL


class SatelliteManager:
    
    TIMEOUT_S = 5
    
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
                    "sensor": {"temperature": None, "humidity": None, "healthy": False, "message": "Not yet polled"},
                    "last_updated": None,
                    "online": False
                })
        
        self._state.set("satellites", updated_satellites)
    
    async def _http_request_async(self, ip, method, path, body=None):
        """Generic async HTTP request using asyncio.open_connection().
        
        Returns:
            (True, response_data) if HTTP request succeeded with 2xx status
            (False, error_message) if HTTP request failed
        """
        reader = None
        writer = None
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, 80),
                timeout=self.TIMEOUT_S
            )
            
            # Build HTTP request
            if body is not None:
                body_str = json.dumps(body)
                request = "{} {} HTTP/1.0\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(
                    method, path, ip, len(body_str), body_str
                )
            else:
                request = "{} {} HTTP/1.0\r\nHost: {}\r\nConnection: close\r\n\r\n".format(method, path, ip)
            
            writer.write(request.encode())
            await writer.drain()
            
            # Read response until EOF (server closes connection)
            chunks = []
            while True:
                chunk = await asyncio.wait_for(
                    reader.read(512),
                    timeout=self.TIMEOUT_S
                )
                if not chunk:
                    break
                chunks.append(chunk)
            
            response = b"".join(chunks).decode()
            
            writer.close()
            await writer.wait_closed()
            
            # Parse HTTP response - handle both \r\n\r\n and \n\n
            header_end = response.find("\r\n\r\n")
            body_offset = 4
            if header_end == -1:
                header_end = response.find("\n\n")
                body_offset = 2
            
            if header_end != -1:
                headers = response[:header_end]
                response_body = response[header_end + body_offset:]
                status_line = headers.split("\n")[0]
                
                if "200" in status_line:
                    data = json.loads(response_body) if response_body.strip() else {}
                    return True, data
                else:
                    return False, "HTTP error: {}".format(status_line)
            else:
                return False, "Invalid HTTP response"
            
        except asyncio.TimeoutError:
            return False, "Connection timeout"
        except Exception as e:
            return False, "Connection failed"
        finally:
            if writer:
                try:
                    writer.close()
                    await writer.wait_closed()
                except:
                    pass

    async def poll_satellite_async(self, ip):
        """Async poll a satellite for sensor readings.
        
        Returns:
            (True, sensor_data) if HTTP request succeeded
            (False, error_message) if HTTP request failed
        """
        success, result = await self._http_request_async(ip, "GET", "/api/readings")
        if success:
            sensor_data = {
                "temperature": result.get("temperature"),
                "humidity": result.get("humidity"),
                "healthy": result.get("healthy"),
                "message": result.get("message")
            }
            return True, sensor_data
        return False, result

    async def sync_satellite_async(self, ip, sync_data):
        """Async sync data to a satellite.
        
        Returns:
            (True, response_data) if sync succeeded
            (False, error_message) if sync failed
        """
        return await self._http_request_async(ip, "POST", "/api/sync", sync_data)
    
    async def poll_all_satellites_async(self):
        """Poll all satellites concurrently without blocking."""
        satellites = self._state.get("satellites", [])
        if not satellites:
            return
        
        current_tick = ticks_ms()
        config = self._state.get("config", {})
        grace_period_ms = config.get("satellite_grace_period", 120) * 1000
        
        # Poll all satellites concurrently
        tasks = [self.poll_satellite_async(sat["ip"]) for sat in satellites]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        updated_satellites = []
        online_ips = []
        
        for sat, result in zip(satellites, results):
            ip = sat["ip"]
            name = sat.get("name", "")
            
            # Handle exceptions from gather
            if isinstance(result, Exception):
                success, result = False, "Connection failed"
            else:
                success, result = result
            
            if success:
                # Poll succeeded - satellite is online, use sensor data from satellite
                updated_satellites.append({
                    "ip": ip,
                    "name": name,
                    "sensor": result,  # sensor_data dict from satellite
                    "last_updated": current_tick,
                    "online": True
                })
                online_ips.append(ip)
            else:
                # Poll failed - check grace period for online status
                last_updated = sat.get("last_updated")
                online = False
                
                if last_updated is not None:
                    elapsed = current_tick - last_updated
                    if elapsed < 0:
                        elapsed = current_tick + (0xFFFFFFFF - last_updated)
                    online = elapsed <= grace_period_ms
                
                # Keep existing sensor data, update message with connection error
                existing_sensor = sat.get("sensor", {"temperature": None, "humidity": None, "healthy": False, "message": ""})
                updated_satellites.append({
                    "ip": ip,
                    "name": name,
                    "sensor": {
                        "temperature": existing_sensor.get("temperature"),
                        "humidity": existing_sensor.get("humidity"),
                        "healthy": False,
                        "message": result  # error message string
                    },
                    "last_updated": last_updated,
                    "online": online
                })
        
        self._state.set("satellites", updated_satellites)
        
        # Sync state to online satellites
        if online_ips:
            sync_data = {
                "flame": self._state.get("flame", False)
            }
            sync_tasks = [self.sync_satellite_async(ip, sync_data) for ip in online_ips]
            await asyncio.gather(*sync_tasks, return_exceptions=True)

    async def loop(self):
        while True:
            config = self._state.get("config", {})
            if config.get("mode") == "host" and not self._state.get("is_pairing"):
                await self.poll_all_satellites_async()
            await asyncio.sleep(SATELLITE_POLLING_INTERVAL)
