import asyncio
import machine
import micropython
from lib.microdot import Microdot, Response, redirect
import urequests
import debug
from state import state
from config import config
from discovery import discovery

app = Microdot()


async def delayed_reset():
    await asyncio.sleep(1)
    machine.reset()


def create_server(pairing, secrets_module):
    
    @app.route('/api/status', methods=['GET'])
    async def get_status(request):
        return {
            "state": state.get_all(),
            "config": config.get_all()
        }
    
    @app.route('/api/state', methods=['GET'])
    async def get_state(request):
        if config.get("mode") == "satellite":
            return state.get_satellite_state()
        return state.get_all()
    
    @app.route('/api/config', methods=['GET'])
    async def get_config(request):
        return config.get_all()
    
    @app.route('/api/config', methods=['POST'])
    async def set_config(request):
        try:
            new_config = request.json
            if new_config:
                config.set_all(new_config)
                return {"status": "ok", "config": config.get_all()}
            return {"error": "No config provided"}, 400
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/config', methods=['PATCH'])
    async def update_config(request):
        try:
            updates = request.json
            if updates:
                config.update_all(updates)
                return {"status": "ok", "config": config.get_all()}
            return {"error": "No updates provided"}, 400
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/wifi/scan', methods=['GET'])
    async def scan_wifi(request):
        networks = pairing.scan_networks()
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
        state.set("is_pairing", False)
        return {"status": "ok", "message": "Exiting pairing mode"}
    
    @app.route('/api/debug', methods=['GET'])
    async def get_debug(request):
        return debug.get_debug_info()
    
    @app.route('/api/mem-info', methods=['GET'])
    async def get_mem_info(request):
        micropython.mem_info(1)
        return {"status": "ok", "message": "mem_info(1) output sent to REPL"}
    
    @app.route('/api/discover', methods=['GET'])
    async def api_discover(request):
        macs_param = request.args.get('macs')
        macs = macs_param.split(',') if macs_param else None
        devices = discovery.discover(macs)
        return {"status": "ok", "devices": devices}
    
    @app.route('/api/sync', methods=['POST'])
    async def sync(request):
        if config.get("mode") != "satellite":
            return {"error": "Sync only available in satellite mode"}, 403
        
        try:
            data = request.json
            if data and "flame" in data:
                state.set("flame", data["flame"])
            return {"status": "ok"}
        except Exception as e:
            return {"error": str(e)}, 400
    
    @app.route('/api/satellite-proxy/<ip>/<path:path>', methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
    async def satellite_proxy(request, ip, path):

        # Check that IP is in configured satellites
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
    
    # Captive portal routes - serve app when in pairing mode
    @app.route('/generate_204')
    @app.route('/hotspot-detect.html')
    @app.route('/library/test/success.html')
    @app.route('/connecttest.txt')
    @app.route('/ncsi.txt')
    @app.route('/success.txt')
    @app.route('/canonical.html')
    @app.route('/check_network_status.txt')
    @app.route('/kindle-wifi/wifistub.html')
    @app.route('/redirect')
    async def serve_captive_portal(request):
        if state.get("is_pairing", False):
            return await serve_index(request)
        return 'Not found', 404
    
    # Catch-all route for static files from the app folder
    @app.route('/<path:path>')
    async def serve_static(request, path):
        try:
            if path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.ico'):
                content_type = 'image/x-icon'
            elif path.endswith('.woff2'):
                content_type = 'font/woff2'
            elif path.endswith('.woff'):
                content_type = 'font/woff'
            elif path.endswith('.webmanifest') or path.endswith('.json'):
                content_type = 'application/json'
            elif path.endswith('.html'):
                content_type = 'text/html'
            else:
                content_type = 'application/octet-stream'
            
            return Response.send_file('app/' + path, content_type=content_type)
        except OSError:
            return "Not found", 404
    
    return app
