import asyncio
import constants
from lib.picozero import RGBLED
from time import ticks_ms
from state import state
from config import config


class LEDManager:
    
    COLOR_OFF = (0, 0, 0)
    COLOR_RED = (1, 0, 0)
    COLOR_GREEN = (0, 1, 0)
    COLOR_BLUE = (0, 0, 1)
    COLOR_YELLOW = (1, 1, 0)
    
    BLINK_ON_TIME = 500
    BLINK_OFF_TIME = 500
    
    def __init__(self):
        self._led = RGBLED(
            red=constants.PIN_LED_RED,
            green=constants.PIN_LED_GREEN,
            blue=constants.PIN_LED_BLUE,
            active_high=True
        )
        self._brightness = config.get("led_brightness", 1.0)
        self._blink_state = False
        self._last_blink_tick = 0
        
        state.subscribe("is_pairing", self._on_state_change)
        state.subscribe("wifi_connected", self._on_state_change)
        state.subscribe("flame", self._on_state_change)
        config.subscribe("led_brightness", self._on_brightness_change)
        
        self._update_led()
    
    def _on_state_change(self, new_value, old_value):
        self._update_led()
    
    def _on_brightness_change(self, new_brightness, old_brightness):
        self._brightness = max(0, min(1, new_brightness if new_brightness is not None else 1.0))
        self._update_led()
    
    def _apply_brightness(self, color):
        return tuple(c * self._brightness for c in color)
    
    def _update_led(self):
        is_pairing = state.get("is_pairing", False)
        wifi_connected = state.get("wifi_connected", False)
        flame_on = state.get("flame", False)
        
        if is_pairing:
            self._update_blink()
        elif not wifi_connected:
            self._led.value = self._apply_brightness(self.COLOR_YELLOW)
        elif flame_on:
            self._led.value = self._apply_brightness(self.COLOR_RED)
        else:
            self._led.value = self._apply_brightness(self.COLOR_GREEN)
    
    def _update_blink(self):
        current_tick = ticks_ms()
        elapsed = current_tick - self._last_blink_tick
        
        if elapsed < 0:
            elapsed = current_tick + (0xFFFFFFFF - self._last_blink_tick)
        
        blink_period = self.BLINK_ON_TIME if self._blink_state else self.BLINK_OFF_TIME
        
        if elapsed >= blink_period:
            self._blink_state = not self._blink_state
            self._last_blink_tick = current_tick
        
        if self._blink_state:
            self._led.value = self._apply_brightness(self.COLOR_BLUE)
        else:
            self._led.value = self.COLOR_OFF
    
    def tick(self):
        if state.get("is_pairing", False):
            self._update_blink()
    
    def off(self):
        self._led.value = self.COLOR_OFF
    
    def close(self):
        self._led.close()

    async def loop(self):
        while True:
            self.tick()
            await asyncio.sleep_ms(100)


led = LEDManager()
