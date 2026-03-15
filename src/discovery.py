import asyncio
import socket
import random
from constants import DISCOVERY_PORT
from wifi import wifi
from config import config
from state import state


DISCOVERY_MSG = "DISCOVER"
IAM_PREFIX = "IAM|"
DISCOVERY_JITTER_MS = 200


class DiscoveryManager:
    """UDP-based device discovery for finding thermostats on the network."""
    
    def __init__(self):
        self._socket = None
        self._socket_failed = False
        state.subscribe("wifi_connected", self._on_wifi_connected)
    
    def _get_mac(self):
        return wifi.get_mac()
    
    def _get_ip(self):
        return wifi.ip_address
    
    def _on_wifi_connected(self, connected, was_connected):
        if connected and not was_connected:
            self._socket_failed = False
            self._ensure_socket_and_announce()
        elif not connected and was_connected:
            self._close_socket()
    
    def _ensure_socket_and_announce(self):
        """Create the listening socket if needed, then send the initial announcement."""
        if not self._socket:
            self._socket = self._create_socket()
        if not self._socket:
            return
        mode = config.get("mode", "host")
        if mode == "host":
            self.send_discover_message()
        elif mode == "satellite":
            self.send_iam_message()
    
    def send_discover_message(self):
        """Broadcast a DISCOVER message on the network."""
        if not self._get_ip():
            print("Discovery: no IP, cannot send DISCOVER")
            return
        
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.sendto(DISCOVERY_MSG.encode(), ('255.255.255.255', DISCOVERY_PORT))
            print("Discovery: sent DISCOVER broadcast")
        except Exception as e:
            print("Discovery: failed to send DISCOVER:", e)
        finally:
            if sock:
                try:
                    sock.close()
                except:
                    pass
    
    def send_iam_message(self, addr=None):
        """Send an IAM message with this device's MAC.
        
        Args:
            addr: Optional (ip, port) tuple to send to directly.
                  If None, broadcasts.
        """
        mac = self._get_mac()
        if not mac:
            print("Discovery: no MAC, cannot send IAM")
            return
        
        message = "IAM|{}".format(mac)
        
        if addr and self._socket:
            try:
                self._socket.sendto(message.encode(), addr)
                print("Discovery: sent IAM to", addr[0])
            except Exception as e:
                print("Discovery: failed to send IAM to", addr[0], ":", e)
            return
        
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.sendto(message.encode(), ('255.255.255.255', DISCOVERY_PORT))
            print("Discovery: sent IAM broadcast")
        except Exception as e:
            print("Discovery: failed to broadcast IAM:", e)
        finally:
            if sock:
                try:
                    sock.close()
                except:
                    pass
    
    def _create_socket(self):
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('0.0.0.0', DISCOVERY_PORT))
            sock.setblocking(False)
            print("Discovery: listening on port", DISCOVERY_PORT)
            return sock
        except Exception as e:
            print("Discovery: socket error:", e)
            if sock:
                try:
                    sock.close()
                except:
                    pass
            return None
    
    def _close_socket(self):
        if self._socket:
            try:
                self._socket.close()
                print("Discovery: socket closed")
            except Exception:
                pass
            self._socket = None
    
    async def _handle_message(self, data, addr):
        """Handle incoming discovery messages."""
        try:
            message = data.decode().strip()
            mode = config.get("mode", "host")
            
            if message == DISCOVERY_MSG and mode == "satellite":
                print("Discovery: received DISCOVER from", addr[0])
                jitter = random.randint(0, DISCOVERY_JITTER_MS)
                await asyncio.sleep_ms(jitter)
                self.send_iam_message((addr[0], DISCOVERY_PORT))
            
            elif message.startswith(IAM_PREFIX) and mode == "host":
                parts = message.split('|')
                if len(parts) >= 2:
                    resp_mac = parts[1].lower()
                    resp_ip = addr[0]
                    print("Discovery: received IAM from", resp_mac, "at", resp_ip)
                    self._update_satellite_ip(resp_mac, resp_ip)
        except Exception as e:
            print("Discovery: handle error:", e)
    
    def _update_satellite_ip(self, mac, ip):
        """Update the IP for a satellite in state, matched by MAC."""
        satellites = state.get("satellites", [])
        updated_satellites = []
        updated = False
        
        for sat in satellites:
            if sat.get("mac", "").lower() == mac.lower():
                if sat.get("ip") != ip:
                    sat = sat.copy()
                    sat["ip"] = ip
                    updated = True
            updated_satellites.append(sat)
        
        if updated:
            state.set("satellites", updated_satellites)
            print("Discovery: updated", mac, "->", ip)
    
    async def loop(self):
        """Main discovery listener loop."""
        while True:
            if wifi.ip_address:
                if not self._socket and not self._socket_failed:
                    self._ensure_socket_and_announce()
                    if not self._socket:
                        print("Discovery: retry in 30s")
                        self._socket_failed = True
                        await asyncio.sleep(30)
                        self._socket_failed = False
                        continue
                
                if self._socket:
                    try:
                        data, addr = self._socket.recvfrom(256)
                        await self._handle_message(data, addr)
                    except OSError:
                        pass
                    except Exception as e:
                        print("Discovery: loop error:", e)
                        self._close_socket()
            else:
                self._close_socket()
                self._socket_failed = False
            
            await asyncio.sleep_ms(100)


discovery = DiscoveryManager()
