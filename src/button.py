import asyncio
from time import ticks_ms
import constants
from lib.picozero import Button
from state import state


class ButtonManager:
    
    def __init__(self):
        self._button = Button(constants.PIN_BUTTON, pull_up=True)
        self._press_start = None
        self._triggered = False
        
        self._button.when_pressed = self._on_press
        self._button.when_released = self._on_release
    
    def _on_press(self):
        self._press_start = ticks_ms()
        self._triggered = False
    
    def _on_release(self):
        self._press_start = None
        self._triggered = False
    
    def tick(self):
        if self._button.is_pressed and self._press_start is not None and not self._triggered:
            current_tick = ticks_ms()
            elapsed = current_tick - self._press_start
            
            if elapsed < 0:
                elapsed = current_tick + (0xFFFFFFFF - self._press_start)
            
            if elapsed >= constants.PAIRING_LONG_PRESS_MS:
                self._triggered = True
                state.set("is_pairing", not state.get("is_pairing", False))
    
    @property
    def is_pressed(self):
        return self._button.is_pressed
    
    def close(self):
        self._button.close()

    async def loop(self):
        while True:
            self.tick()
            await asyncio.sleep_ms(50)


button = ButtonManager()
