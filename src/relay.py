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
        config.subscribe("relay_enabled", self._on_relay_enabled_change)
    
    def _on_flame_change(self, new_flame, old_flame):
        if config.get("mode") == "satellite" and not config.get("relay_enabled", True):
            self._relay.off()
            return

        if new_flame:
            self._relay.on()
        else:
            self._relay.off()

    def _on_relay_enabled_change(self, new_value, old_value):
        if config.get("mode") != "satellite":
            return

        if not new_value:
            self._relay.off()
            return

        if state.get("flame"):
            self._relay.on()
        else:
            self._relay.off()
    
    def off(self):
        self._relay.off()


relay = RelayManager()
