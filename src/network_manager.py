import asyncio
import network
from state_manager import state


class NetworkManager:
    
    def __init__(self):
        self._sta = None
    
    def get_rssi(self):
        """Get current WiFi signal strength (RSSI)."""
        try:
            if self._sta is None:
                self._sta = network.WLAN(network.STA_IF)
            
            if self._sta.isconnected():
                return self._sta.status('rssi')
            return None
        except Exception:
            return None
    
    def rssi_to_strength(self, rssi):
        """Convert RSSI to 0-4 strength level."""
        if rssi is None:
            return 0
        if rssi >= -50:
            return 4
        if rssi >= -60:
            return 3
        if rssi >= -70:
            return 2
        return 1
    
    async def loop(self):
        while True:
            rssi = self.get_rssi()
            strength = self.rssi_to_strength(rssi)
            state.set("wifi_strength", strength)
            await asyncio.sleep(5)


network_manager = NetworkManager()
