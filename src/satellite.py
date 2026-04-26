import asyncio
import json
from time import ticks_ms
from constants import SATELLITE_POLLING_INTERVAL
from state import state
from config import config


class SatelliteManager:

    TIMEOUT_S = 5
    MAX_CONCURRENT = 3

    def __init__(self):
        self._polling = False
        self._sync_satellites_from_config()
        config.subscribe("satellites", self._on_satellites_config_change)
    
    def _on_satellites_config_change(self, new_sats, old_sats):
        if new_sats != old_sats:
            self._sync_satellites_from_config()
    
    def _sync_satellites_from_config(self):
        """Sync config.satellites (objects with mac/name) to state.satellites.
        
        Config stores: mac, name
        State stores: mac, ip, state, last_updated, online
        """
        config_sats = config.get("satellites", [])
        current_satellites = state.get("satellites", [])
        current_by_mac = {sat["mac"]: sat for sat in current_satellites}
        
        updated_satellites = []
        for sat_config in config_sats:
            mac = sat_config.get("mac", "").lower()
            
            if mac in current_by_mac:
                updated_satellites.append(current_by_mac[mac])
            else:
                updated_satellites.append({
                    "mac": mac,
                    "ip": None,
                    "state": None,
                    "last_updated": None,
                    "online": False
                })
        
        state.set("satellites", updated_satellites)
    
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
        """Async poll a satellite for its trimmed state (sensor and wifi_strength).
        
        Returns:
            (True, state_data) if HTTP request succeeded
            (False, error_message) if HTTP request failed
        """
        success, result = await self._http_request_async(ip, "GET", "/api/state")
        if success:
            return True, result
        return False, result

    async def sync_satellite_async(self, ip, sync_data):
        """Async sync data to a satellite.
        
        Returns:
            (True, response_data) if sync succeeded
            (False, error_message) if sync failed
        """
        return await self._http_request_async(ip, "POST", "/api/sync", sync_data)
    
    async def _gather_batched(self, coro_factory, items):
        """Run coro_factory(item) for each item, capped at MAX_CONCURRENT in flight.

        Avoids exhausting the lwIP TCP PCB pool when there are many satellites.
        """
        results = []
        for i in range(0, len(items), self.MAX_CONCURRENT):
            batch = items[i:i + self.MAX_CONCURRENT]
            batch_results = await asyncio.gather(
                *[coro_factory(item) for item in batch],
                return_exceptions=True,
            )
            results.extend(batch_results)
        return results

    async def poll_all_satellites_async(self):
        """Poll all satellites without exhausting the lwIP socket pool."""
        satellites = state.get("satellites", [])
        if not satellites:
            return

        current_tick = ticks_ms()
        grace_period_ms = config.get("satellite_grace_period", 120) * 1000

        # Only poll satellites that have IPs
        sats_with_ip = [sat for sat in satellites if sat.get("ip")]

        if not sats_with_ip:
            return

        results = await self._gather_batched(
            lambda sat: self.poll_satellite_async(sat["ip"]),
            sats_with_ip,
        )
        
        # Create lookup for poll results by MAC
        poll_results = {}
        for sat, result in zip(sats_with_ip, results):
            poll_results[sat["mac"]] = result
        
        updated_satellites = []
        online_ips = []
        
        for sat in satellites:
            mac = sat.get("mac", "")
            ip = sat.get("ip")
            
            if mac in poll_results:
                result = poll_results[mac]
                
                # Handle exceptions from gather
                if isinstance(result, Exception):
                    success, data = False, "Connection failed"
                else:
                    success, data = result
                
                if success:
                    # Poll succeeded - satellite is online
                    updated_satellites.append({
                        "mac": mac,
                        "ip": ip,
                        "state": data,
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
                    
                    updated_satellites.append({
                        "mac": mac,
                        "ip": ip,
                        "state": sat.get("state"),
                        "last_updated": last_updated,
                        "online": online
                    })
            else:
                # No IP - keep as-is, mark offline
                updated_satellites.append({
                    "mac": mac,
                    "ip": ip,
                    "state": sat.get("state"),
                    "last_updated": sat.get("last_updated"),
                    "online": False
                })
        
        state.set("satellites", updated_satellites)
        
        # Sync state to online satellites
        if online_ips:
            sync_data = {
                "flame": state.get("flame", False),
                "target_temperature": config.get("target_temperature", 22.0),
                "operating_mode": config.get("operating_mode", "manual"),
            }
            await self._gather_batched(
                lambda ip: self.sync_satellite_async(ip, sync_data),
                online_ips,
            )

    async def _run_poll(self):
        try:
            await self.poll_all_satellites_async()
        finally:
            self._polling = False

    async def loop(self):
        while True:
            if config.get("mode") == "host" and not state.get("is_pairing"):
                if self._polling:
                    print("Satellite: previous poll still in progress, skipping")
                else:
                    self._polling = True
                    asyncio.create_task(self._run_poll())
            await asyncio.sleep(SATELLITE_POLLING_INTERVAL)


satellite = SatelliteManager()
