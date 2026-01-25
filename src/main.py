import asyncio
from machine import WDT

import secrets
from config import config
from state import state
from sensor import sensor
from led import led
from relay import relay
from button import button
from pairing import pairing
from satellite import satellite
from thermostat import thermostat
from temperature import temperature
from web_server import create_server, app
from dns_server import dns_server
from wifi import wifi
from discovery import discovery


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
    
    wifi.init()
    
    create_server(pairing, secrets)
    
    tasks = [
        asyncio.create_task(sensor.loop()),
        asyncio.create_task(led.loop()),
        asyncio.create_task(button.loop()),
        asyncio.create_task(watchdog_loop()),
        asyncio.create_task(dns_server.loop()),
        asyncio.create_task(wifi.loop()),
        asyncio.create_task(satellite.loop()),
        asyncio.create_task(discovery.loop()),
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
