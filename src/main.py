import asyncio
from machine import WDT

import secrets_manager
from config_manager import config
from state_manager import state
from sensor_manager import sensor
from led_manager import led
from relay_manager import relay
from button_manager import button
from pairing_manager import pairing
from satellite_manager import satellite_manager
from thermostat import thermostat
from web_server import create_server, app
from dns_server import dns_server
from network_manager import network_manager


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


async def watchdog_loop():
    while True:
        pet_watchdog()
        await asyncio.sleep_ms(1000)


async def main():
    print("PicoThermostat starting...")
    
    # init_watchdog()
    # pet_watchdog()
    
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
    
    create_server(pairing, secrets_manager)
    
    tasks = [
        asyncio.create_task(sensor.loop()),
        asyncio.create_task(led.loop()),
        asyncio.create_task(button.loop()),
        asyncio.create_task(watchdog_loop()),
        asyncio.create_task(dns_server.loop()),
        asyncio.create_task(network_manager.loop()),
        asyncio.create_task(satellite_manager.loop()),
    ]
    
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
