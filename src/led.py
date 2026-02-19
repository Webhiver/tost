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
    COLOR_VIOLET = (1, 0, 1)

    BLINK_ON_TIME = 500
    BLINK_OFF_TIME = 500
    FADE_OUT_DURATION = 2000  # 2 seconds to fade off
    FADE_IN_DURATION = 2000   # 2 seconds to fade on
    FADE_STEPS = 20           # Number of fade steps

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
        self._fade_state = 0  # 0 = not fading, 1-FADE_STEPS = fading out, FADE_STEPS+1 to 2*FADE_STEPS = fading in
        self._last_fade_tick = 0
        
        state.subscribe("is_pairing", self._on_state_change)
        state.subscribe("wifi_connected", self._on_state_change)
        state.subscribe("flame", self._on_state_change)
        config.subscribe("led_brightness", self._on_brightness_change)
        config.subscribe("operating_mode", self._on_operating_mode_change)

        self._update_led()

    def _on_operating_mode_change(self, new_value, old_value):
        # Reset fade when entering 'off' mode
        if new_value == "off":
            self._fade_state = 1
            self._last_fade_tick = ticks_ms()
        else:
            self._fade_state = 0
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
        operating_mode = config.get("operating_mode", "manual")

        if is_pairing:
            self._update_blink()
        elif not wifi_connected:
            self._led.value = self._apply_brightness(self.COLOR_YELLOW)
        elif flame_on:
            self._led.value = self._apply_brightness(self.COLOR_RED)
        elif operating_mode == "off":
            self._update_fade()
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

    def _update_fade(self):
        current_tick = ticks_ms()
        elapsed = current_tick - self._last_fade_tick

        if elapsed < 0:
            elapsed = current_tick + (0xFFFFFFFF - self._last_fade_tick)

        # Fading out: steps 1 to FADE_STEPS
        if self._fade_state <= self.FADE_STEPS:
            step_duration = self.FADE_OUT_DURATION // self.FADE_STEPS
            if elapsed >= step_duration:
                self._fade_state += 1
                self._last_fade_tick = current_tick

            if self._fade_state <= self.FADE_STEPS:
                # Calculate fade-off brightness
                fade_brightness = 1.0 - (self._fade_state / self.FADE_STEPS)
                faded_color = tuple(c * fade_brightness * self._brightness for c in self.COLOR_VIOLET)
                self._led.value = faded_color
        # Fading in: steps FADE_STEPS+1 to 2*FADE_STEPS
        else:
            step_duration = self.FADE_IN_DURATION // self.FADE_STEPS
            if elapsed >= step_duration:
                self._fade_state += 1
                self._last_fade_tick = current_tick

            if self._fade_state > 2 * self.FADE_STEPS:
                # Fade cycle complete, restart
                self._fade_state = 1
                self._last_fade_tick = current_tick
            else:
                # Calculate fade-in brightness
                fade_in_step = self._fade_state - self.FADE_STEPS
                fade_brightness = fade_in_step / self.FADE_STEPS
                faded_color = tuple(c * fade_brightness * self._brightness for c in self.COLOR_VIOLET)
                self._led.value = faded_color

    def tick(self):
        if state.get("is_pairing", False):
            self._update_blink()
        elif config.get("operating_mode", "manual") == "off":
            self._update_fade()
    
    def off(self):
        self._led.value = self.COLOR_OFF
    
    def close(self):
        self._led.close()

    async def loop(self):
        while True:
            self.tick()
            await asyncio.sleep_ms(100)


led = LEDManager()
