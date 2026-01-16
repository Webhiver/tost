import asyncio
import machine
from lib.microdot import Microdot, Response, redirect

app = Microdot()


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
