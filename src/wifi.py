import asyncio
import network
import secrets
from state import state


class WifiManager:
    
    def __init__(self):
        self._sta = None
        
        state.subscribe("is_pairing", self._on_pairing_change)
    
    def _on_pairing_change(self, is_pairing, was_pairing):
        if is_pairing:
            state.set("wifi_connected", False)
        else:
            self.connect()
    
    def init(self):
        """Initialize WiFi - connect or enter pairing mode."""
        state.set("mac", self.get_mac())

        if secrets.has_wifi_credentials():
            print("Connecting to WiFi...")
            self.connect()
        else:
            print("No WiFi credentials, entering pairing mode...")
            state.set("is_pairing", True)
    
    def connect(self, ssid=None, password=None):
        """Initiate WiFi connection (non-blocking). The loop() handles state updates."""
        if ssid is None or password is None:
            creds = secrets.load()
            if creds is None:
                return
            ssid = creds.get("ssid")
            password = creds.get("password")
        
        if not ssid:
            return
        
        self._sta = network.WLAN(network.STA_IF)
        self._sta.active(True)
        self._sta.connect(ssid, password)
    
    @property
    def ip_address(self):
        if self._sta and self._sta.isconnected():
            return self._sta.ifconfig()[0]
        return None
    
    def get_mac(self):
        """Get the device's MAC address as a hex string."""
        try:
            wlan = network.WLAN(network.STA_IF)
            mac_bytes = wlan.config('mac')
            return ':'.join('{:02x}'.format(b) for b in mac_bytes)
        except Exception:
            return None
    
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
            # Sync wifi_connected state with actual connection status
            is_connected = self._sta is not None and self._sta.isconnected()
            if is_connected != state.get("wifi_connected", False):
                if is_connected:
                    print("WiFi connected, IP:", self.ip_address)
                    state.set("ip", self.ip_address)
                else:
                    print("WiFi disconnected")
                state.set("wifi_connected", is_connected)

            rssi = self.get_rssi()
            strength = self.rssi_to_strength(rssi)
            state.set("wifi_strength", strength)
            await asyncio.sleep(4)


wifi = WifiManager()
