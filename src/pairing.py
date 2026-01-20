import network
import machine
import constants
import binascii
from state import state


class PairingManager:
    
    AP_IP = constants.AP_IP
    AP_SUBNET = constants.AP_SUBNET
    AP_GATEWAY = constants.AP_IP
    AP_DNS = constants.AP_IP
    
    def __init__(self):
        self._ap = None
        self._ap_ssid = None
        
        state.subscribe("is_pairing", self._on_pairing_change)
    
    def _on_pairing_change(self, is_pairing, was_pairing):
        if is_pairing:
            print("Entering pairing mode...")
            ap_name = self.start_ap()
            print("AP started:", ap_name)
            state.set("wifi_connected", False)
        else:
            print("Exiting pairing mode...")
            self.stop_ap()
            import secrets
            if secrets.has_wifi_credentials():
                from wifi import wifi
                if wifi.connect():
                    print("WiFi connected!")
                    state.set("wifi_connected", True)
                else:
                    print("WiFi connection failed")
                    state.set("wifi_connected", False)
    
    def _generate_ap_name(self):
        try:
            uid = machine.unique_id()
            suffix = binascii.hexlify(uid[-2:]).decode().upper()
        except Exception:
            suffix = "0000"
        return "PicoThermostat_{}".format(suffix)
    
    def start_ap(self):
        self._ap_ssid = self._generate_ap_name()
        
        # Disable station mode when starting AP
        sta = network.WLAN(network.STA_IF)
        sta.active(False)
        
        self._ap = network.WLAN(network.AP_IF)
        self._ap.config(essid=self._ap_ssid, security=0)
        self._ap.ifconfig((self.AP_IP, self.AP_SUBNET, self.AP_GATEWAY, self.AP_DNS))
        self._ap.active(True)
        
        while not self._ap.active():
            pass
        
        return self._ap_ssid
    
    def stop_ap(self):
        if self._ap:
            self._ap.active(False)
    
    @property
    def ip_address(self):
        if state.get("is_pairing") and self._ap:
            return self.AP_IP
        from wifi import wifi
        return wifi.ip_address
    
    @property
    def ap_ssid(self):
        return self._ap_ssid
    
    def scan_networks(self):
        sta = network.WLAN(network.STA_IF)
        
        was_active = sta.active()
        if not was_active:
            sta.active(True)
        
        try:
            networks = sta.scan()
            result = []
            for net in networks:
                ssid = net[0].decode('utf-8') if isinstance(net[0], bytes) else net[0]
                rssi = net[3]
                if ssid:
                    result.append({"ssid": ssid, "rssi": rssi})
            
            result.sort(key=lambda x: x["rssi"], reverse=True)
            return result
        finally:
            if not was_active and not state.get("is_pairing"):
                sta.active(False)


pairing = PairingManager()
