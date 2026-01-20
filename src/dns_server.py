import asyncio
import socket
import struct
import network_config
from state_manager import state


class DNSServer:
    """
    Captive portal DNS server that responds to all queries with a fixed IP.
    This makes devices detect a captive portal and show the login page.
    """
    
    def __init__(self, ip_address=None, port=53):
        if ip_address is None:
            ip_address = network_config.AP_IP
        self.ip_address = ip_address
        self.port = port
        self._socket = None
        self._running = False
    
    def _is_pairing(self):
        """Check if we're in pairing mode."""
        return state.get("is_pairing", False)
    
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
        
        # Extract transaction ID from request
        transaction_id = request[:2]
        
        # Parse flags - we just need to set response flag
        # Request flags are at bytes 2-3
        # Response: QR=1, OPCODE=0, AA=1, TC=0, RD=1, RA=1, RCODE=0
        flags = b'\x85\x80'  # Standard response, authoritative
        
        # Question count (from request)
        qdcount = struct.unpack('!H', request[4:6])[0]
        
        # We'll answer with 1 answer
        ancount = b'\x00\x01'
        nscount = b'\x00\x00'
        arcount = b'\x00\x00'
        
        # Build header
        header = transaction_id + flags + request[4:6] + ancount + nscount + arcount
        
        # Copy the question section from request
        # Find end of question section (after QNAME, QTYPE, QCLASS)
        pos = 12
        while pos < len(request):
            length = request[pos]
            if length == 0:
                pos += 1  # null terminator
                break
            pos += length + 1
        pos += 4  # QTYPE (2) + QCLASS (2)
        
        question = request[12:pos]
        
        # Build answer section
        # Name pointer to question (0xC00C points to offset 12)
        answer_name = b'\xc0\x0c'
        # Type A (1), Class IN (1)
        answer_type = b'\x00\x01'
        answer_class = b'\x00\x01'
        # TTL (60 seconds)
        answer_ttl = b'\x00\x00\x00\x3c'
        # RDLENGTH (4 bytes for IPv4)
        answer_rdlength = b'\x00\x04'
        # RDATA (IP address)
        ip_parts = [int(x) for x in self.ip_address.split('.')]
        answer_rdata = bytes(ip_parts)
        
        answer = answer_name + answer_type + answer_class + answer_ttl + answer_rdlength + answer_rdata
        
        return header + question + answer
    
    async def start(self):
        """Start the DNS server."""
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.bind(('0.0.0.0', self.port))
        self._socket.setblocking(False)
        
        self._running = True
        print(f"DNS server started on port {self.port}")
    
    def stop(self):
        """Stop the DNS server."""
        self._running = False
        if self._socket:
            self._socket.close()
            self._socket = None
        print("DNS server stopped")
    
    async def loop(self):
        """Main DNS server loop. Only responds when in pairing mode."""
        await self.start()
        
        while self._running:
            try:
                # Only process DNS when in pairing mode
                if not self._is_pairing():
                    await asyncio.sleep_ms(100)
                    continue
                
                # Non-blocking receive
                try:
                    data, addr = self._socket.recvfrom(512)
                    if data:
                        domain = self._parse_domain(data)
                        print(f"DNS: {addr[0]} -> {domain}")
                        response = self._build_response(data)
                        if response:
                            self._socket.sendto(response, addr)
                except OSError:
                    # No data available (EAGAIN/EWOULDBLOCK)
                    pass
                
                await asyncio.sleep_ms(10)
                
            except Exception as e:
                print(f"DNS error: {e}")
                await asyncio.sleep_ms(100)


dns_server = DNSServer()
