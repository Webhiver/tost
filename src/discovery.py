import asyncio
import socket
import random
from time import ticks_ms, ticks_diff
from constants import DISCOVERY_PORT
from wifi import wifi


# Discovery protocol constants
DISCOVERY_MSG = "DISCOVER"
DISCOVERY_TIMEOUT_MS = 2000
DISCOVERY_JITTER_MS = 200


class DiscoveryManager:
    """UDP-based device discovery for finding thermostats on the network."""
    
    def __init__(self):
        self._socket = None
        self._socket_failed = False
    
    def _get_mac(self):
        """Get the device's MAC address as a hex string."""
        return wifi.get_mac()
    
    def _get_ip(self):
        """Get the device's current IP address."""
        return wifi.ip_address
    
    def _create_socket(self):
        """Create and bind the UDP socket for discovery."""
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
        """Close the discovery socket."""
        if self._socket:
            try:
                self._socket.close()
                print("Discovery: socket closed")
            except Exception:
                pass
            self._socket = None
    
    def discover(self, macs=None):
        """Discover devices on the network.
        
        Sends a DISCOVER broadcast and collects IAM responses.
        
        Args:
            macs: Optional list of MAC addresses to find. If provided,
                  returns immediately when all are found.
        
        Returns:
            Dict mapping MAC addresses to IP addresses
        """
        devices = {}
        sock = None
        
        # Normalize target MACs to lowercase set for fast lookup
        target_macs = None
        if macs:
            target_macs = set(mac.lower() for mac in macs)
            print("Discovery: searching for", len(target_macs), "device(s)")
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.settimeout(0.1)  # Short timeout for polling
            
            # Send broadcast DISCOVER message
            print("Discovery: broadcasting...")
            sock.sendto(DISCOVERY_MSG.encode(), ('255.255.255.255', DISCOVERY_PORT))
            
            # Collect responses until timeout or all targets found
            start_time = ticks_ms()
            
            while True:
                elapsed = ticks_diff(ticks_ms(), start_time)
                if elapsed > DISCOVERY_TIMEOUT_MS:
                    break
                
                try:
                    data, addr = sock.recvfrom(256)
                    response = data.decode().strip()
                    
                    # Parse IAM|{ip}|{mac} response
                    if response.startswith("IAM|"):
                        parts = response.split('|')
                        if len(parts) >= 3:
                            resp_ip = parts[1]
                            resp_mac = parts[2].lower()
                            devices[resp_mac] = resp_ip
                            print("Discovery: found", resp_mac, "at", resp_ip)
                            
                            # Check if all targets found
                            if target_macs and target_macs.issubset(devices.keys()):
                                print("Discovery: all targets found")
                                break
                            
                except OSError:
                    # No data available, continue polling
                    pass
            
            sock.close()
            print("Discovery: found {} device(s)".format(len(devices)))
            
        except Exception as e:
            print("Discovery: failed:", e)
            if sock:
                try:
                    sock.close()
                except:
                    pass
        
        return devices
    
    async def _handle_discovery(self, data, addr):
        """Handle incoming discovery messages with jitter."""
        try:
            message = data.decode().strip()
            
            if message == DISCOVERY_MSG:
                print("Discovery: request from", addr[0])
                
                # Add random jitter to avoid simultaneous responses
                jitter = random.randint(0, DISCOVERY_JITTER_MS)
                await asyncio.sleep_ms(jitter)
                
                ip = self._get_ip()
                mac = self._get_mac()
                
                if ip and mac:
                    response = "IAM|{}|{}".format(ip, mac)
                    self._socket.sendto(response.encode(), addr)
                    print("Discovery: responded with", response, "(jitter: {}ms)".format(jitter))
        except Exception as e:
            print("Discovery: handle error:", e)
    
    async def loop(self):
        """Main discovery listener loop."""
        while True:
            # Only run when WiFi is connected
            if wifi.ip_address:
                if not self._socket and not self._socket_failed:
                    self._socket = self._create_socket()
                    if not self._socket:
                        # Socket creation failed, wait before retrying
                        print("Discovery: retry in 30s")
                        self._socket_failed = True
                        await asyncio.sleep(30)
                        self._socket_failed = False
                        continue
                
                if self._socket:
                    try:
                        data, addr = self._socket.recvfrom(256)
                        await self._handle_discovery(data, addr)
                    except OSError:
                        # No data available (non-blocking socket)
                        pass
                    except Exception as e:
                        print("Discovery: loop error:", e)
                        self._close_socket()
            else:
                # WiFi disconnected, close socket
                self._close_socket()
                self._socket_failed = False
            
            await asyncio.sleep_ms(100)


discovery = DiscoveryManager()
