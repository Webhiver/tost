import asyncio
from machine import WDT

import config_manager
import secrets_manager
from state_manager import state
from sensor_manager import sensor
from led_manager import led
from relay_manager import relay
from button_manager import button
from pairing_manager import pairing
from satellite_manager import SatelliteManager
from thermostat import Thermostat
from web_server import create_server, app


wdt = None


def init_watchdog():
    global wdt
    try:
        wdt = WDT(timeout=8000)
    except Exception:
        print("Watchdog not available")
        wdt = None


def pet_watchdog():
    if wdt:
        wdt.feed()


def init_state():
    config = config_manager.load()
    state.set("config", config)
    
    satellites = []
    for ip in config.get("satellites", []):
        satellites.append({
            "ip": ip,
            "sensor": {"temperature": None, "humidity": None},
            "last_updated": None,
            "online": False
        })
    state.set("satellites", satellites)


async def watchdog_loop():
    while True:
        pet_watchdog()
        await asyncio.sleep_ms(1000)


async def main():
    print("PicoThermostat starting...")
    
    init_watchdog()
    pet_watchdog()
    
    init_state()
    
    config = state.get("config", {})
    led.set_brightness(config.get("led_brightness", 1.0))
    
    sat_manager = SatelliteManager(state)
    thermostat = Thermostat(state)
    
    if secrets_manager.has_wifi_credentials():
        print("Attempting WiFi connection...")
        
        if pairing.connect_wifi():
            print("WiFi connected!")
            print("IP:", pairing.ip_address)
            state.set("wifi_connected", True)
        else:
            print("WiFi connection failed")
            state.set("wifi_connected", False)
    else:
        print("No WiFi credentials, entering pairing mode...")
        state.set("is_pairing", True)
        ap_name = pairing.start_ap()
        print("AP started:", ap_name)
    
    create_server(state, pairing, config_manager, secrets_manager)
    
    tasks = [
        asyncio.create_task(sensor.loop()),
        asyncio.create_task(led.loop()),
        asyncio.create_task(button.loop()),
        asyncio.create_task(watchdog_loop()),
    ]
    
    if config.get("mode") == "host":
        tasks.append(asyncio.create_task(sat_manager.loop()))
        tasks.append(asyncio.create_task(thermostat.loop()))
    
    print("Starting web server on port 80...")
    server_task = asyncio.create_task(app.start_server(host='0.0.0.0', port=80))
    tasks.append(server_task)
    
    print("PicoThermostat running!")
    print("Mode:", config.get("mode", "host"))
    
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Shutting down...")
        led.off()
        relay.off()
