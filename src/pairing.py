import network
import machine
import secrets
import constants
import binascii


class PairingManager:
    
    AP_IP = constants.AP_IP
    AP_SUBNET = constants.AP_SUBNET
    AP_GATEWAY = constants.AP_IP
    AP_DNS = constants.AP_IP
    
    def __init__(self):
        self._ap = None
        self._sta = None
        self._is_pairing = False
        self._ap_ssid = None
    
    def _generate_ap_name(self):
        try:
            uid = machine.unique_id()
            suffix = binascii.hexlify(uid[-2:]).decode().upper()
        except Exception:
            suffix = "0000"
        return "PicoThermostat_{}".format(suffix)
    
    def start_ap(self):
        self._ap_ssid = self._generate_ap_name()
        
        self._sta = network.WLAN(network.STA_IF)
        self._sta.active(False)
        
        self._ap = network.WLAN(network.AP_IF)
        self._ap.config(essid=self._ap_ssid, security=0)
        self._ap.ifconfig((self.AP_IP, self.AP_SUBNET, self.AP_GATEWAY, self.AP_DNS))
        self._ap.active(True)
        
        self._is_pairing = True
        
        while not self._ap.active():
            pass
        
        return self._ap_ssid
    
    def stop_ap(self):
        if self._ap:
            self._ap.active(False)
        self._is_pairing = False
    
    def connect_wifi(self, ssid=None, password=None):
        if ssid is None or password is None:
            creds = secrets.load()
            if creds is None:
                return False
            ssid = creds.get("ssid")
            password = creds.get("password")
        
        if not ssid:
            return False
        
        if self._ap:
            self._ap.active(False)
        
        self._sta = network.WLAN(network.STA_IF)
        self._sta.active(True)
        
        self._sta.connect(ssid, password)
        
        import time
        timeout = 10000
        start = time.ticks_ms()
        
        while not self._sta.isconnected():
            elapsed = time.ticks_ms() - start
            if elapsed > timeout:
                return False
            time.sleep_ms(100)
        
        return True
    
    def disconnect_wifi(self):
        if self._sta:
            self._sta.disconnect()
            self._sta.active(False)
    
    def save_credentials(self, ssid, password):
        secrets.save(ssid, password)
        return self.connect_wifi(ssid, password)
    
    @property
    def is_pairing(self):
        return self._is_pairing
    
    @property
    def is_connected(self):
        if self._sta:
            return self._sta.isconnected()
        return False
    
    @property
    def ip_address(self):
        if self._is_pairing and self._ap:
            return self.AP_IP
        if self._sta and self._sta.isconnected():
            return self._sta.ifconfig()[0]
        return None
    
    @property
    def ap_ssid(self):
        return self._ap_ssid
    
    def scan_networks(self):
        if self._sta is None:
            self._sta = network.WLAN(network.STA_IF)
        
        was_active = self._sta.active()
        if not was_active:
            self._sta.active(True)
        
        try:
            networks = self._sta.scan()
            result = []
            for net in networks:
                ssid = net[0].decode('utf-8') if isinstance(net[0], bytes) else net[0]
                rssi = net[3]
                if ssid:
                    result.append({"ssid": ssid, "rssi": rssi})
            
            result.sort(key=lambda x: x["rssi"], reverse=True)
            return result
        finally:
            if not was_active and not self._is_pairing:
                self._sta.active(False)


pairing = PairingManager()
