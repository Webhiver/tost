import gc
import machine
import os
import time

# Track boot time for uptime calculation
_boot_ticks = time.ticks_ms()


def get_debug_info():
    """Gather all debug information about the device."""
    # Force garbage collection for accurate memory reading
    gc.collect()
    
    return {
        "memory": _get_memory_info(),
        "cpu": _get_cpu_info(),
        "uptime": _get_uptime_info(),
        "internal_temp_c": _get_internal_temp(),
        "flash": _get_flash_info(),
        "system": _get_system_info(),
        "network": _get_network_info()
    }


def _get_memory_info():
    """Get memory usage information."""
    mem_free = gc.mem_free()
    mem_alloc = gc.mem_alloc()
    mem_total = mem_free + mem_alloc
    
    return {
        "free_bytes": mem_free,
        "allocated_bytes": mem_alloc,
        "total_bytes": mem_total,
        "free_kb": round(mem_free / 1024, 1),
        "percent_used": round((mem_alloc / mem_total) * 100, 1)
    }


def _get_cpu_info():
    """Get CPU information."""
    cpu_freq = machine.freq()
    
    return {
        "frequency_hz": cpu_freq,
        "frequency_mhz": cpu_freq // 1_000_000
    }


def _get_uptime_info():
    """Get device uptime information."""
    current_ticks = time.ticks_ms()
    uptime_ms = time.ticks_diff(current_ticks, _boot_ticks)
    uptime_seconds = uptime_ms // 1000
    uptime_minutes = uptime_seconds // 60
    uptime_hours = uptime_minutes // 60
    uptime_days = uptime_hours // 24
    
    return {
        "milliseconds": uptime_ms,
        "seconds": uptime_seconds,
        "formatted": "{}d {}h {}m {}s".format(
            uptime_days,
            uptime_hours % 24,
            uptime_minutes % 60,
            uptime_seconds % 60
        )
    }


def _get_internal_temp():
    """Get internal temperature from RP2040/RP2350 ADC."""
    try:
        sensor_temp = machine.ADC(4)
        reading = sensor_temp.read_u16()
        voltage = reading * 3.3 / 65535
        # Temperature formula for RP2040/RP2350
        internal_temp_c = 27 - (voltage - 0.706) / 0.001721
        return round(internal_temp_c, 1)
    except Exception:
        return None


def _get_flash_info():
    """Get flash storage information."""
    try:
        stat = os.statvfs('/')
        block_size = stat[0]
        total_blocks = stat[2]
        free_blocks = stat[3]
        flash_total = block_size * total_blocks
        flash_free = block_size * free_blocks
        flash_used = flash_total - flash_free
        
        return {
            "total_bytes": flash_total,
            "free_bytes": flash_free,
            "used_bytes": flash_used,
            "total_kb": round(flash_total / 1024, 1),
            "free_kb": round(flash_free / 1024, 1),
            "percent_used": round((flash_used / flash_total) * 100, 1)
        }
    except Exception:
        return {
            "total_bytes": None,
            "free_bytes": None,
            "used_bytes": None,
            "total_kb": None,
            "free_kb": None,
            "percent_used": None
        }


def _get_system_info():
    """Get system information."""
    try:
        uname = os.uname()
        return {
            "sysname": uname.sysname,
            "nodename": uname.nodename,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine
        }
    except Exception:
        return None


def _get_network_info():
    """Get network information."""
    try:
        import network
        wlan = network.WLAN(network.STA_IF)
        if wlan.active() and wlan.isconnected():
            ifconfig = wlan.ifconfig()
            return {
                "ip": ifconfig[0],
                "subnet": ifconfig[1],
                "gateway": ifconfig[2],
                "dns": ifconfig[3],
                "rssi": wlan.status('rssi') if hasattr(wlan, 'status') else None
            }
    except Exception:
        pass
    return None
