import asyncio
# from machine import WDT


wdt = None


def init():
    pass
    # global wdt
    # try:
    #     wdt = WDT(timeout=8000)
    # except Exception:
    #     print("Watchdog not available")


def pet():
    if wdt:
        wdt.feed()


async def loop():
    init()

    while True:
        pet()
        await asyncio.sleep_ms(1000)
