import asyncio
from time import ticks_ms
import hardware_config
from lib.picozero import Button
from state_manager import state
from pairing_manager import pairing
import secrets_manager


class ButtonManager:
    
    LONG_PRESS_MS = 3000
    
    def __init__(self):
        self._button = Button(hardware_config.PIN_BUTTON, pull_up=True)
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
            
            if elapsed >= self.LONG_PRESS_MS:
                self._triggered = True
                self._toggle_pairing()
    
    def _toggle_pairing(self):
        is_pairing = not state.get("is_pairing", False)
        state.set("is_pairing", is_pairing)
        
        if is_pairing:
            print("Entering pairing mode...")
            ap_name = pairing.start_ap()
            print("AP started:", ap_name)
            state.set("wifi_connected", False)
        else:
            print("Exiting pairing mode...")
            pairing.stop_ap()
            if secrets_manager.has_wifi_credentials():
                if pairing.connect_wifi():
                    print("WiFi connected!")
                    state.set("wifi_connected", True)
                else:
                    print("WiFi connection failed")
                    state.set("wifi_connected", False)
    
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
