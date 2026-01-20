from time import ticks_ms
from lib.picozero import DigitalOutputDevice
import constants
from state import state
from config import config


class RelayManager:
    
    def __init__(self):
        self._relay = DigitalOutputDevice(
            pin=constants.PIN_RELAY,
            active_high=True,
            initial_value=False
        )
        
        state.subscribe("flame", self._on_flame_change)
    
    def _on_flame_change(self, new_flame, old_flame):
        if config.get("mode") == "satellite":
            return
        
        if new_flame:
            self._relay.on()
            if not old_flame:
                state.set("flame_start_tick", ticks_ms())
        else:
            self._relay.off()
            state.set("flame_start_tick", None)
    
    def on(self):
        self._relay.on()
    
    def off(self):
        self._relay.off()
    
    @property
    def is_on(self):
        return self._relay.value == 1
    
    def close(self):
        self.off()
        self._relay.close()


relay = RelayManager()
