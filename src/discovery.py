import asyncio
import socket
import random
from constants import DISCOVERY_PORT
from wifi import wifi
from config import config
from state import state

DISCOVERY_JITTER_MS = 200
SOCKET_RETRY_S = 30


class DiscoveryManager:
    """UDP-based device discovery for finding thermostats on the network.
    
    Socket lifecycle is driven entirely by wifi_connected state changes.
    The async loop only reads incoming messages from the socket.
    """
    
    def __init__(self):
        self._socket = None
        self._needs_open = False
        state.subscribe("wifi_connected", self._on_wifi_changed)
    
    def _on_wifi_changed(self, connected, was_connected):
        if connected and not was_connected:
            if self._open():
                self._announce()
            else:
                self._needs_open = True
        elif not connected and was_connected:
            self._close()
            self._needs_open = False
    
    def _open(self):
        """Create the non-blocking UDP listening socket."""
        self._close()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('0.0.0.0', DISCOVERY_PORT))
            sock.setblocking(False)
            self._socket = sock
            print("Discovery: listening on port", DISCOVERY_PORT)
            return True
        except Exception as e:
            print("Discovery: socket error:", e)
            return False
    
    def _close(self):
        if self._socket:
            try:
                self._socket.close()
            except Exception:
                pass
            self._socket = None
    
    def _announce(self):
        """Send initial announcement based on device mode."""
        mode = config.get("mode", "host")
        if mode == "host":
            self.send_discover_message()
        elif mode == "satellite":
            self._broadcast_iam()

    def _broadcast(self, message):
        """Send a one-shot UDP broadcast via a temporary socket."""
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.sendto(message.encode(), ('255.255.255.255', DISCOVERY_PORT))
            return True
        except Exception as e:
            print("Discovery: broadcast failed:", e)
            return False
        finally:
            if sock:
                try:
                    sock.close()
                except:
                    pass
    
    def send_discover_message(self):
        """Broadcast a DISCOVER message on the network."""
        if not wifi.ip_address:
            return
        if self._broadcast("DISCOVER"):
            print("Discovery: sent DISCOVER broadcast")
    
    def _broadcast_iam(self):
        mac = wifi.get_mac()
        if not mac:
            return
        if self._broadcast("IAM|{}".format(mac)):
            print("Discovery: sent IAM broadcast")
    
    def _send_iam_to(self, addr):
        """Send IAM reply to a specific address via the listening socket."""
        mac = wifi.get_mac()
        if not mac or not self._socket:
            return
        try:
            self._socket.sendto("IAM|{}".format(mac).encode(), addr)
            print("Discovery: sent IAM to", addr[0])
        except Exception as e:
            print("Discovery: failed to send IAM to", addr[0], ":", e)
    
    async def _handle_message(self, data, addr):
        try:
            message = data.decode().strip()
            mode = config.get("mode", "host")
            
            if message == "DISCOVER" and mode == "satellite":
                print("Discovery: received DISCOVER from", addr[0])
                jitter = random.randint(0, DISCOVERY_JITTER_MS)
                await asyncio.sleep_ms(jitter)
                self._send_iam_to((addr[0], DISCOVERY_PORT))
            
            elif message.startswith("IAM|") and mode == "host":
                parts = message.split('|')
                if len(parts) >= 2:
                    mac = parts[1].lower()
                    ip = addr[0]
                    print("Discovery: received IAM from", mac, "at", ip)
                    self._update_satellite_ip(mac, ip)
        except Exception as e:
            print("Discovery: handle error:", e)
    
    def _update_satellite_ip(self, mac, ip):
        """Update the IP for a satellite in state, matched by MAC."""
        satellites = state.get("satellites", [])
        updated = []
        changed = False
        
        for sat in satellites:
            if sat.get("mac", "").lower() == mac.lower():
                if sat.get("ip") != ip:
                    sat = sat.copy()
                    sat["ip"] = ip
                    changed = True
            updated.append(sat)
        
        if changed:
            state.set("satellites", updated)
            print("Discovery: updated", mac, "->", ip)
    
    async def loop(self):
        """Listen for incoming discovery messages.
        
        Socket creation is handled by _on_wifi_changed. The loop only retries
        if the initial creation failed, and otherwise just reads messages.
        """
        while True:
            if self._needs_open and not self._socket:
                if self._open():
                    self._needs_open = False
                    self._announce()
                else:
                    print("Discovery: retry in", SOCKET_RETRY_S, "s")
                    await asyncio.sleep(SOCKET_RETRY_S)
                    continue
            
            if self._socket:
                try:
                    data, addr = self._socket.recvfrom(256)
                    await self._handle_message(data, addr)
                except OSError:
                    pass
                except Exception as e:
                    print("Discovery: error:", e)
                    self._close()
                    self._needs_open = True
            
            await asyncio.sleep_ms(100)


discovery = DiscoveryManager()
