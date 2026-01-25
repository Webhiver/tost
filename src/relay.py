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
        # if config.get("mode") == "satellite":
        #     return
        
        if new_flame:
            self._relay.on()
        else:
            self._relay.off()
    
    def off(self):
        self._relay.off()


relay = RelayManager()
