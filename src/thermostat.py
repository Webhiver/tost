import asyncio
from time import ticks_ms
from state import state
from config import config


class Thermostat:
    
    def __init__(self):
        state.subscribe("effective_temperature", self._on_temp_change)
        config.subscribe("mode", self._on_mode_change)
        config.subscribe("operating_mode", self._on_operating_mode_change)
        config.subscribe("target_temperature", self._on_config_change)
        config.subscribe("hysteresis", self._on_config_change)
        config.subscribe("max_flame_duration", self._on_config_change)
        config.subscribe("flame_cooldown", self._on_config_change)
    
    def _is_active(self):
        return (config.get("mode") == "host" and 
                config.get("operating_mode") == "manual" and 
                not state.get("is_pairing"))
    
    def _on_temp_change(self, new_val, old_val):
        if self._is_active():
            self.update()
    
    def _on_mode_change(self, new_mode, old_mode):
        if new_mode == "host":
            self.update(ignore_hysteresis=True)
        elif old_mode == "host":
            # Switching away from host mode - turn off flame
            state.set("flame", False)
    
    def _on_operating_mode_change(self, new_mode, old_mode):
        if new_mode == "off":
            # Switching to off mode - turn off flame and clear cooldown
            state.set("flame", False)
            state.set("flame_start_tick", None)
            state.set("flame_cooldown_start_tick", None)
        elif new_mode == "manual" and config.get("mode") == "host":
            # Switching back to manual mode - update thermostat
            self.update(ignore_hysteresis=True)
    
    def _on_config_change(self, new_val, old_val):
        if self._is_active():
            self.update(ignore_hysteresis=True)
    
    def get_flame_duration(self):
        flame_start_tick = state.get("flame_start_tick")
        if not state.get("flame") or flame_start_tick is None:
            return 0
        
        current_tick = ticks_ms()
        elapsed = current_tick - flame_start_tick
        
        if elapsed < 0:
            elapsed = current_tick + (0xFFFFFFFF - flame_start_tick)
        
        return elapsed / 1000
    
    def is_in_cooldown(self):
        cooldown_start = state.get("flame_cooldown_start_tick")
        if cooldown_start is None:
            return False
        flame_cooldown = config.get("flame_cooldown", 0)
        if flame_cooldown <= 0:
            return False
        elapsed = ticks_ms() - cooldown_start
        if elapsed < 0:
            elapsed = ticks_ms() + (0xFFFFFFFF - cooldown_start)
        return elapsed / 1000 < flame_cooldown

    def should_turn_flame_on(self, effective_temp, ignore_hysteresis=False):
        if effective_temp is None:
            return False

        if self.is_in_cooldown():
            return False

        target_temperature = config.get("target_temperature", 22.0)
        hysteresis = 0 if ignore_hysteresis else config.get("hysteresis", 1.0)
        threshold = target_temperature - hysteresis
        
        return effective_temp < threshold
    
    def should_turn_flame_off(self, effective_temp, ignore_hysteresis=False):
        max_flame_duration = config.get("max_flame_duration", 14400)
        
        if self.get_flame_duration() > max_flame_duration:
            return True
        
        if effective_temp is None:
            return False
        
        target_temperature = config.get("target_temperature", 22.0)
        hysteresis = 0 if ignore_hysteresis else config.get("hysteresis", 1.0)
        threshold = target_temperature + hysteresis
        
        return effective_temp >= threshold
    
    def update(self, ignore_hysteresis=False):
        effective_temp = state.get("effective_temperature")
        current_flame = state.get("flame", False)
        
        if current_flame:
            if self.should_turn_flame_off(effective_temp, ignore_hysteresis):
                max_flame_duration = config.get("max_flame_duration", 14400)
                if self.get_flame_duration() > max_flame_duration:
                    state.set("flame_cooldown_start_tick", ticks_ms())
                state.set("flame", False)
                state.set("flame_start_tick", None)
        else:
            if self.should_turn_flame_on(effective_temp, ignore_hysteresis):
                state.set("flame", True)
                state.set("flame_start_tick", ticks_ms())
        
        state.set("flame_duration", self.get_flame_duration())
        
        return state.get("flame", False)

    async def loop(self):
        while True:
            if self._is_active() and state.get("flame"):
                self.update()
            await asyncio.sleep(1)


# Singleton instance
thermostat = Thermostat()
