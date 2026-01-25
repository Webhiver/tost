import json

SECRETS_FILE = ".env/secrets.json"


def load():
    try:
        with open(SECRETS_FILE, "r") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def save(ssid, password):
    secrets = {
        "ssid": ssid,
        "password": password
    }
    with open(SECRETS_FILE, "w") as f:
        json.dump(secrets, f)
    return secrets


def has_wifi_credentials():
    secrets = load()
    return secrets is not None and "ssid" in secrets and "password" in secrets
