import asyncio
import socket
import struct
import constants
from state import state


class DNSServer:
    """Captive portal DNS server that responds to all queries with a fixed IP.
    
    Only runs while in pairing mode. Socket lifecycle is driven by
    is_pairing state changes; the async loop only reads incoming queries.
    """
    
    def __init__(self, ip_address=None, port=53):
        if ip_address is None:
            ip_address = constants.AP_IP
        self.ip_address = ip_address
        self.port = port
        self._socket = None
        state.subscribe("is_pairing", self._on_pairing_changed)
    
    def _on_pairing_changed(self, is_pairing, was_pairing):
        if is_pairing:
            self._open()
        else:
            self._close()
    
    def _open(self):
        self._close()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('0.0.0.0', self.port))
            sock.setblocking(False)
            self._socket = sock
            print("DNS server started on port", self.port)
        except Exception as e:
            print("DNS server error:", e)
    
    def _close(self):
        if self._socket:
            try:
                self._socket.close()
            except Exception:
                pass
            self._socket = None
    
    def _parse_domain(self, request):
        """Extract the domain name from a DNS request."""
        if len(request) < 12:
            return None
        
        domain_parts = []
        pos = 12
        try:
            while pos < len(request):
                length = request[pos]
                if length == 0:
                    break
                pos += 1
                domain_parts.append(request[pos:pos + length].decode())
                pos += length
        except Exception:
            return "<invalid>"
        
        return '.'.join(domain_parts)
    
    def _build_response(self, request):
        """Build a DNS response pointing all queries to our IP."""
        if len(request) < 12:
            return None
        
        transaction_id = request[:2]
        flags = b'\x85\x80'
        
        ancount = b'\x00\x01'
        nscount = b'\x00\x00'
        arcount = b'\x00\x00'
        
        header = transaction_id + flags + request[4:6] + ancount + nscount + arcount
        
        # Find end of question section (QNAME + QTYPE + QCLASS)
        pos = 12
        while pos < len(request):
            length = request[pos]
            if length == 0:
                pos += 1
                break
            pos += length + 1
        pos += 4
        
        question = request[12:pos]
        
        # Answer: pointer to question name, Type A, Class IN, TTL 60s, 4-byte IPv4
        answer_name = b'\xc0\x0c'
        answer_type = b'\x00\x01'
        answer_class = b'\x00\x01'
        answer_ttl = b'\x00\x00\x00\x3c'
        answer_rdlength = b'\x00\x04'
        answer_rdata = bytes(int(x) for x in self.ip_address.split('.'))
        
        answer = answer_name + answer_type + answer_class + answer_ttl + answer_rdlength + answer_rdata
        
        return header + question + answer
    
    async def loop(self):
        while True:
            if self._socket:
                try:
                    data, addr = self._socket.recvfrom(512)
                    if data:
                        domain = self._parse_domain(data)
                        print("DNS: {} -> {}".format(addr[0], domain))
                        response = self._build_response(data)
                        if response:
                            self._socket.sendto(response, addr)
                except OSError:
                    pass
                except Exception as e:
                    print("DNS error:", e)
                await asyncio.sleep_ms(10)
            else:
                await asyncio.sleep_ms(100)


dns_server = DNSServer()
