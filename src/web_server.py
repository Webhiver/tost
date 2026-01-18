import asyncio
import gc
import machine
import os
import time
from lib.microdot import Microdot, Response, redirect
import urequests

app = Microdot()

# Track boot time for uptime calculation
_boot_ticks = time.ticks_ms()


async def delayed_reset():
    await asyncio.sleep(1)
    machine.reset()


CAPTIVE_PORTAL_PATHS = [
    '/generate_204',
    '/hotspot-detect.html',
    '/library/test/success.html',
    '/connecttest.txt',
    '/ncsi.txt',
    '/success.txt',
    '/canonical.html',
    '/check_network_status.txt',
    '/kindle-wifi/wifistub.html',
    '/redirect',
]


def create_server(state_manager, pairing_manager, config_module, secrets_module):
    
    @app.route('/api/status', methods=['GET'])
    async def get_status(request):
        return state_manager.get_all()
    
    @app.route('/api/readings', methods=['GET'])
    async def get_readings(request):
        return state_manager.get("sensor", {"temperature": None, "humidity": None})
    
    @app.route('/api/config', methods=['GET'])
    async def get_config(request):
        return state_manager.get("config", {})
    
    @app.route('/api/config', methods=['POST'])
    async def set_config(request):
        try:
            new_config = request.json
            if new_config:
                state_manager.set("config", new_config)
                config_module.save(new_config)
                return {"status": "ok", "config": state_manager.get("config")}
            return {"error": "No config provided"}, 400
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/config', methods=['PATCH'])
    async def update_config(request):
        try:
            updates = request.json
            if updates:
                state_manager.update("config", updates)
                config_module.save(state_manager.get("config"))
                return {"status": "ok", "config": state_manager.get("config")}
            return {"error": "No updates provided"}, 400
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/wifi/scan', methods=['GET'])
    async def scan_wifi(request):
        networks = pairing_manager.scan_networks()
        return {"networks": networks}
    
    @app.route('/api/wifi/connect', methods=['POST'])
    async def connect_wifi(request):
        try:
            data = request.json
            ssid = data.get("ssid")
            password = data.get("password", "")
            
            if not ssid:
                return {"error": "SSID required"}, 400
            
            secrets_module.save(ssid, password)
            
            asyncio.create_task(delayed_reset())
            
            return {"status": "ok", "message": "Credentials saved. Device will restart."}
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/pairing/exit', methods=['POST'])
    async def exit_pairing(request):
        state_manager.set("is_pairing", False)
        return {"status": "ok", "message": "Exiting pairing mode"}
    
    @app.route('/api/debug', methods=['GET'])
    async def get_debug(request):
        # Force garbage collection for accurate memory reading
        gc.collect()
        
        # Memory info
        mem_free = gc.mem_free()
        mem_alloc = gc.mem_alloc()
        mem_total = mem_free + mem_alloc
        
        # CPU frequency
        cpu_freq = machine.freq()
        
        # Uptime calculation
        current_ticks = time.ticks_ms()
        uptime_ms = time.ticks_diff(current_ticks, _boot_ticks)
        uptime_seconds = uptime_ms // 1000
        uptime_minutes = uptime_seconds // 60
        uptime_hours = uptime_minutes // 60
        uptime_days = uptime_hours // 24
        
        # Internal temperature sensor (ADC channel 4)
        try:
            sensor_temp = machine.ADC(4)
            reading = sensor_temp.read_u16()
            voltage = reading * 3.3 / 65535
            # Temperature formula for RP2040/RP2350
            internal_temp_c = 27 - (voltage - 0.706) / 0.001721
            internal_temp_c = round(internal_temp_c, 1)
        except Exception:
            internal_temp_c = None
        
        # Flash/storage info
        try:
            stat = os.statvfs('/')
            block_size = stat[0]
            total_blocks = stat[2]
            free_blocks = stat[3]
            flash_total = block_size * total_blocks
            flash_free = block_size * free_blocks
            flash_used = flash_total - flash_free
        except Exception:
            flash_total = None
            flash_free = None
            flash_used = None
        
        # System info
        try:
            uname = os.uname()
            sys_info = {
                "sysname": uname.sysname,
                "nodename": uname.nodename,
                "release": uname.release,
                "version": uname.version,
                "machine": uname.machine
            }
        except Exception:
            sys_info = None
        
        # Network info
        network_info = None
        try:
            import network
            wlan = network.WLAN(network.STA_IF)
            if wlan.active() and wlan.isconnected():
                ifconfig = wlan.ifconfig()
                network_info = {
                    "ip": ifconfig[0],
                    "subnet": ifconfig[1],
                    "gateway": ifconfig[2],
                    "dns": ifconfig[3],
                    "rssi": wlan.status('rssi') if hasattr(wlan, 'status') else None
                }
        except Exception:
            pass
        
        return {
            "memory": {
                "free_bytes": mem_free,
                "allocated_bytes": mem_alloc,
                "total_bytes": mem_total,
                "free_kb": round(mem_free / 1024, 1),
                "percent_used": round((mem_alloc / mem_total) * 100, 1)
            },
            "cpu": {
                "frequency_hz": cpu_freq,
                "frequency_mhz": cpu_freq // 1_000_000
            },
            "uptime": {
                "milliseconds": uptime_ms,
                "seconds": uptime_seconds,
                "formatted": "{}d {}h {}m {}s".format(
                    uptime_days,
                    uptime_hours % 24,
                    uptime_minutes % 60,
                    uptime_seconds % 60
                )
            },
            "internal_temp_c": internal_temp_c,
            "flash": {
                "total_bytes": flash_total,
                "free_bytes": flash_free,
                "used_bytes": flash_used,
                "total_kb": round(flash_total / 1024, 1) if flash_total else None,
                "free_kb": round(flash_free / 1024, 1) if flash_free else None,
                "percent_used": round((flash_used / flash_total) * 100, 1) if flash_total and flash_used else None
            },
            "system": sys_info,
            "network": network_info
        }
    
    @app.route('/api/satellite-proxy/<ip>/<path:path>', methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
    async def satellite_proxy(request, ip, path):

        # Check that IP is in configured satellites
        config = state_manager.get("config", {})
        satellites = config.get("satellites", [])
        satellite_ips = [sat.get("ip") for sat in satellites]
        
        if ip not in satellite_ips:
            return {"error": "Satellite not found"}, 404
        
        # Proxy the request to the satellite
        url = "http://{}:80/api/{}".format(ip, path)
        response = None
        try:
            # Forward request based on method
            if request.method == 'GET':
                response = urequests.get(url, timeout=5)
            elif request.method == 'POST':
                response = urequests.post(url, json=request.json, timeout=5)
            elif request.method == 'PATCH':
                response = urequests.patch(url, json=request.json, timeout=5)
            elif request.method == 'PUT':
                response = urequests.put(url, json=request.json, timeout=5)
            elif request.method == 'DELETE':
                response = urequests.delete(url, timeout=5)
            else:
                return {"error": "Method not supported"}, 405
            
            # Return the satellite's response
            status_code = response.status_code
            data = response.json()
            response.close()
            
            return data, status_code
            
        except Exception as e:
            if response:
                response.close()
            return {"error": "Failed to reach satellite: {}".format(str(e))}, 502
    
    @app.route('/')
    async def serve_index(request):
        try:
            return Response.send_file('app/index.html', content_type='text/html')
        except OSError:
            return "App not found. Please upload the app/ folder.", 404
    
    @app.route('/assets/<path:path>')
    async def serve_assets(request, path):
        try:
            if path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.woff2'):
                content_type = 'font/woff2'
            elif path.endswith('.woff'):
                content_type = 'font/woff'
            else:
                content_type = 'application/octet-stream'
            
            return Response.send_file('app/assets/' + path, content_type=content_type)
        except OSError:
            return "Not found", 404
    
    async def serve_captive_portal(request):
        if state_manager.get("is_pairing", False):
            return await serve_index(request)
        return 'Not found', 404
    
    for path in CAPTIVE_PORTAL_PATHS:
        app.route(path)(serve_captive_portal)
    
    return app
