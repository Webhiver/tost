import asyncio

from config import config
from sensor import sensor
from led import led
from relay import relay
from button import button
from satellite import satellite
from hw_revision import HW_REVISION
from thermostat import thermostat
from temperature import temperature
from web_server import web_server
from dns_server import dns_server
from wifi import wifi
from discovery import discovery
import watchdog


async def main():
    print("PicoThermostat starting...")
    print("HW Revision:", HW_REVISION)

    tasks = [
        asyncio.create_task(watchdog.loop()),
        asyncio.create_task(sensor.loop()),
        asyncio.create_task(led.loop()),
        asyncio.create_task(button.loop()),
        asyncio.create_task(dns_server.loop()),
        asyncio.create_task(wifi.loop()),
        asyncio.create_task(satellite.loop()),
        asyncio.create_task(discovery.loop()),
        asyncio.create_task(web_server.loop()),
    ]

    # print("PicoThermostat running!")
    print("Mode:", config.get("mode", "host"))

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Shutting down...")
        led.off()
        relay.off()
