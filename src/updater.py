"""
Firmware update utilities.
Called by boot.py to apply pending updates before main.py runs.
"""
import os
import gc
import machine
import asyncio
from state import state


UPDATE_FILE = '/update.tar.gz'


# Paths that should not be moved/deleted during update
PROTECTED_PATHS = ['.env', 'update.tar.gz', '.backup']
BACKUP_DIR = '/.backup'


def is_protected(name):
    """Check if a root-level item should not be touched."""
    return name in [p.strip('/').split('/')[0] for p in PROTECTED_PATHS]


def remove_dir_recursive(path):
    """Recursively remove a directory and all its contents."""
    try:
        for entry in os.listdir(path):
            full_path = path + '/' + entry
            try:
                os.listdir(full_path)
                remove_dir_recursive(full_path)
            except OSError:
                os.remove(full_path)
        os.rmdir(path)
    except OSError:
        pass


def makedirs(path):
    """Create directory and all parent directories if they don't exist."""
    parts = path.strip('/').split('/')
    current = ''
    for part in parts:
        current = current + '/' + part
        try:
            os.mkdir(current)
        except OSError:
            pass


def move_to_backup():
    """Move all root items (except protected) to backup directory."""
    try:
        os.mkdir(BACKUP_DIR)
    except OSError:
        pass

    for item in os.listdir('/'):
        if is_protected(item):
            continue
        src = '/' + item
        dst = BACKUP_DIR + '/' + item
        print("  backup: {} -> {}".format(src, dst))
        os.rename(src, dst)


def restore_from_backup():
    """Restore all items from backup directory to root."""
    try:
        for item in os.listdir(BACKUP_DIR):
            src = BACKUP_DIR + '/' + item
            dst = '/' + item
            # Remove any partially extracted files first
            try:
                os.listdir(dst)
                remove_dir_recursive(dst)
            except OSError:
                try:
                    os.remove(dst)
                except OSError:
                    pass
            print("  restore: {} -> {}".format(src, dst))
            os.rename(src, dst)
        os.rmdir(BACKUP_DIR)
    except OSError:
        pass


def delete_backup():
    """Delete the backup directory."""
    remove_dir_recursive(BACKUP_DIR)


def sync_filesystem():
    """Ensure filesystem changes are flushed to flash."""
    try:
        os.sync()
    except AttributeError:
        # os.sync() not available, try alternative
        pass
    # Small delay to ensure flash write completes
    import time
    time.sleep_ms(500)


def parse_tar_header(data):
    """
    Parse a tar header block (512 bytes).
    Returns (name, size, type) or None if end of archive.
    """
    if len(data) < 512:
        return None

    # Check for null block (end of archive)
    if data[:512] == bytes(512):
        return None

    # Extract filename (first 100 bytes, null terminated)
    # MicroPython decode() doesn't support keyword args, so wrap in try/except
    try:
        name = data[0:100].rstrip(b'\x00').decode('utf-8')
    except:
        name = data[0:100].rstrip(b'\x00').decode('latin-1')

    if not name:
        return None

    # Extract file size (octal, bytes 124-135)
    try:
        size_str = data[124:136].rstrip(b'\x00 ').decode('ascii')
        size = int(size_str, 8) if size_str else 0
    except:
        size = 0

    # Extract type flag (byte 156)
    # '0' or '\0' = regular file, '5' = directory
    type_flag = data[156:157]
    if type_flag == b'5':
        file_type = 'd'
    elif type_flag == b'0' or type_flag == b'\x00':
        file_type = 'f'
    else:
        file_type = 'f'  # Treat others as files

    # Handle UStar format - check for prefix (bytes 345-500)
    try:
        prefix = data[345:500].rstrip(b'\x00').decode('utf-8')
    except:
        prefix = data[345:500].rstrip(b'\x00').decode('latin-1')
    if prefix:
        name = prefix + '/' + name

    return (name, size, file_type)


def skip_bytes(stream, count):
    """Read and discard bytes from stream (for non-seekable streams)."""
    while count > 0:
        chunk_size = min(count, 4096)
        data = stream.read(chunk_size)
        if not data:
            break
        count -= len(data)


def extract_from_stream(stream, dest_path='/'):
    """
    Extract tar entries from a stream (can be decompressed gzip stream).
    Returns list of extracted file paths.
    Works with non-seekable streams by reading instead of seeking.
    """
    extracted_files = []

    while True:
        # Read header block
        header = stream.read(512)
        if len(header) < 512:
            break

        parsed = parse_tar_header(header)
        if parsed is None:
            break

        name, size, file_type = parsed

        # Calculate padding for this entry
        padding = (512 - (size % 512)) % 512 if size > 0 else 0

        # Skip if name is empty or just '.'
        if not name or name == '.' or name == './':
            if size > 0:
                skip_bytes(stream, size + padding)
            continue

        # Normalize the path
        name = name.lstrip('./')
        full_path = dest_path.rstrip('/') + '/' + name

        if file_type == 'd':
            # Create directory
            makedirs(full_path.rstrip('/'))
            extracted_files.append(full_path.rstrip('/'))
        else:
            # Create parent directories if needed
            parent = '/'.join(full_path.split('/')[:-1])
            if parent:
                makedirs(parent)

            # Read file data
            if size > 0:
                # Write file in chunks to handle memory constraints
                with open(full_path, 'wb') as out_f:
                    remaining = size
                    while remaining > 0:
                        chunk_size = min(remaining, 4096)
                        chunk = stream.read(chunk_size)
                        if not chunk:
                            break
                        out_f.write(chunk)
                        remaining -= len(chunk)

                # Skip padding to 512-byte boundary
                if padding:
                    skip_bytes(stream, padding)
            else:
                # Create empty file
                with open(full_path, 'wb') as out_f:
                    pass

            extracted_files.append(full_path)
            print("  extracted: {}".format(full_path))

    return extracted_files


def extract_tar_gz(gz_path, dest_path='/'):
    """
    Stream-extract a tar.gz archive directly without intermediate .tar file.
    Decompresses and extracts in one pass to minimize flash usage.
    """
    import deflate

    with open(gz_path, 'rb') as f_in:
        with deflate.DeflateIO(f_in, deflate.GZIP) as stream:
            return extract_from_stream(stream, dest_path)


def apply_update(archive_path):
    """
    Apply a firmware update from a tar.gz archive.

    SAFE approach with rollback:
    1. Move existing files to backup
    2. Stream-extract tar.gz directly (no intermediate .tar file)
    3. If successful, delete backup and archive
    4. If failed, restore from backup
    """
    backup_created = False

    try:
        # Step 1: Move existing files to backup
        print("updater: creating backup...")
        move_to_backup()
        backup_created = True

        # Step 2: Stream-extract tar.gz directly (decompress + extract in one pass)
        print("updater: extracting...")
        extracted_files = extract_tar_gz(archive_path, '/')

        if not extracted_files:
            raise Exception("No files extracted from archive")

        print("updater: extracted {} files".format(len(extracted_files)))

        # Step 3: Success - delete backup and archive
        print("updater: cleaning up...")
        delete_backup()
        try:
            os.remove(archive_path)
        except OSError:
            pass

        print("updater: complete!")
        return True

    except Exception as e:
        print("updater: FAILED - {}".format(e))

        # Restore from backup if we created one
        if backup_created:
            print("updater: restoring from backup...")
            restore_from_backup()

        # Clean up archive
        try:
            os.remove(archive_path)
        except OSError:
            pass

        raise e


def apply_pending_update():
    """
    Check for and apply any pending firmware update.
    Called from boot.py to run with minimal memory usage.
    """
    # Set LED to teal during update (direct control, no state dependency)
    import constants
    from lib.picozero import RGBLED
    led = RGBLED(
        red=constants.PIN_LED_RED,
        green=constants.PIN_LED_GREEN,
        blue=constants.PIN_LED_BLUE,
        active_high=True
    )
    led.value = (0, 1, 1)  # Teal (green + blue)

    # Get file size for logging
    try:
        file_size = os.stat(UPDATE_FILE)[6]
    except:
        file_size = 0

    print("updater: Found pending update")
    print("updater: File: {} ({} bytes)".format(UPDATE_FILE, file_size))

    # Free up memory before update
    gc.collect()
    free_mem = gc.mem_free()
    print("updater: Free memory: {} bytes".format(free_mem))

    try:
        print("updater: Applying update...")
        apply_update(UPDATE_FILE)
        print("updater: Update applied successfully!")

        # Sync filesystem before reset to ensure deletions are persisted
        sync_filesystem()

        print("updater: Rebooting into new firmware...")
        machine.reset()

    except Exception as e:
        print("updater: UPDATE FAILED: {}".format(e))
        # Try to clean up the failed update file
        try:
            os.remove(UPDATE_FILE)
            print("updater: Cleaned up failed update file")
        except OSError:
            pass
        print("updater: Continuing with existing firmware...")


# CHECK_INTERVAL_S = 3600
CHECK_INTERVAL_S = 5


class UpdateChecker:

    async def loop(self):
        while True:
            if state.get("wifi_connected"):
                try:
                    available = self._check()
                    state.set("firmware_update_available", available)
                except Exception as e:
                    print("update check failed:", e)
            await asyncio.sleep(CHECK_INTERVAL_S)

    def _check(self):
        try:
            import ssl
        except ImportError:
            import ussl as ssl
        try:
            import socket
        except ImportError:
            import usocket as socket

        current = state.get("firmware_version", "")
        if not current:
            return False

        host = "github.com"
        path = "/Webhiver/tost/releases/latest"
        sock = None
        try:
            addr = socket.getaddrinfo(host, 443, 0, socket.SOCK_STREAM)[0][-1]
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect(addr)
            sock = ssl.wrap_socket(sock, server_hostname=host)
            sock.write("GET {} HTTP/1.1\r\nHost: {}\r\nUser-Agent: tost-device\r\nConnection: close\r\n\r\n".format(path, host).encode())
            location = None
            while True:
                line = sock.readline().decode("utf-8").strip()
                if not line:
                    break
                if line.lower().startswith("location:"):
                    location = line.split(":", 1)[1].strip()
        finally:
            if sock:
                sock.close()

        if not location:
            return False

        latest = location.rstrip("/").split("/")[-1].lstrip("v")

        def parse(v):
            parts = v.strip().split(".")[:3]
            return [int(x.split("-")[0].split("+")[0]) for x in parts]

        return parse(latest) > parse(current.strip().lstrip("v"))


update_checker = UpdateChecker()
