"""
Boot script that runs before main.py.
Checks for pending firmware update and applies it if found.
"""
import os

UPDATE_FILE = '/update.tar.gz'


def check_for_update():
    """Check if an update file exists and apply it."""
    try:
        os.stat(UPDATE_FILE)
    except OSError:
        return  # No update file
    
    # Import updater only when needed to save memory
    import updater
    updater.apply_pending_update()


# Run update check on import (boot.py is executed on startup)
check_for_update()
