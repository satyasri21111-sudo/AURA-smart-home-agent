"""Authoritative in-memory state manager for the simulated smart home."""
import copy
import secrets
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

class HomeStateManager:
    def __init__(self):
        self._initial_state: Dict[str, Any] = {
            "living_room_light": {
                "id": "living_room_light",
                "name": "Living Room Light",
                "on": True,
                "brightness": 80,
                "type": "light"
            },
            "bedroom_light": {
                "id": "bedroom_light",
                "name": "Bedroom Light",
                "on": False,
                "brightness": 0,
                "type": "light"
            },
            "thermostat": {
                "id": "thermostat",
                "name": "Main Thermostat",
                "target_temp": 21.0,
                "current_temp": 20.5,
                "mode": "heat",
                "type": "climate"
            },
            "front_door": {
                "id": "front_door",
                "name": "Front Door",
                "locked": True,
                "type": "security"
            }
        }
        self._state: Dict[str, Any] = copy.deepcopy(self._initial_state)
        self._last_updated: str = datetime.now(timezone.utc).isoformat()
        # Pending confirmation tokens: token -> { action, payload, expires_at, created_at, description }
        self._pending_confirmations: Dict[str, Dict[str, Any]] = {}

    def get_state(self) -> Dict[str, Any]:
        """Returns a deep copy of the complete authoritative home state."""
        return {
            "devices": copy.deepcopy(self._state),
            "last_updated": self._last_updated
        }

    def reset_state(self) -> Dict[str, Any]:
        """Restores the documented initial demo state."""
        self._state = copy.deepcopy(self._initial_state)
        self._last_updated = datetime.now(timezone.utc).isoformat()
        self._pending_confirmations.clear()
        return self.get_state()

    def update_light(self, device_id: str, on: Optional[bool] = None, brightness: Optional[int] = None) -> Tuple[bool, Dict[str, Any]]:
        """Updates light state authoritatively."""
        if device_id not in self._state:
            return False, {"error": f"Unknown light device: {device_id}"}
        
        device = self._state[device_id]
        prev_state = copy.deepcopy(device)

        if brightness is not None:
            device["brightness"] = brightness
            device["on"] = brightness > 0
        elif on is not None:
            device["on"] = on
            if not on:
                device["brightness"] = 0
            elif device["brightness"] == 0:
                device["brightness"] = 75  # Default pleasant brightness when turning on without specifying

        self._last_updated = datetime.now(timezone.utc).isoformat()
        return True, {
            "device_id": device_id,
            "previous": prev_state,
            "current": copy.deepcopy(device)
        }

    def update_thermostat(self, target_temp: Optional[float] = None, mode: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """Updates thermostat state authoritatively."""
        device = self._state["thermostat"]
        prev_state = copy.deepcopy(device)

        if target_temp is not None:
            device["target_temp"] = target_temp
        if mode is not None:
            device["mode"] = mode

        self._last_updated = datetime.now(timezone.utc).isoformat()
        return True, {
            "device_id": "thermostat",
            "previous": prev_state,
            "current": copy.deepcopy(device)
        }

    def update_door_lock(self, locked: bool) -> Tuple[bool, Dict[str, Any]]:
        """Updates door lock state authoritatively."""
        device = self._state["front_door"]
        prev_state = copy.deepcopy(device)
        device["locked"] = locked

        self._last_updated = datetime.now(timezone.utc).isoformat()
        return True, {
            "device_id": "front_door",
            "previous": prev_state,
            "current": copy.deepcopy(device)
        }

    def create_pending_confirmation(self, action: str, payload: Dict[str, Any], description: str, expiry_seconds: int = 60) -> Dict[str, Any]:
        """Creates an unguessable security token for an action requiring explicit confirmation."""
        # Cleanup expired tokens first
        now = time.time()
        expired = [t for t, data in self._pending_confirmations.items() if data["expires_at"] <= now]
        for t in expired:
            del self._pending_confirmations[t]

        token = f"sec_cf_{secrets.token_urlsafe(24)}"
        expires_at = now + expiry_seconds

        record = {
            "token": token,
            "action": action,
            "payload": payload,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "expires_in_seconds": expiry_seconds
        }
        self._pending_confirmations[token] = record
        return record

    def consume_confirmation_token(self, token: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """Validates and consumes a single-use confirmation token.
        Returns (success, error_reason, action_data).
        """
        if not token or not isinstance(token, str):
            return False, "Invalid confirmation token format", None

        if token not in self._pending_confirmations:
            return False, "Confirmation token not found, invalid, or already consumed", None

        data = self._pending_confirmations.pop(token)
        now = time.time()

        if now > data["expires_at"]:
            return False, "Confirmation token has expired. Please request the action again.", None

        return True, None, data

# Singleton authoritative instance
home_state_manager = HomeStateManager()
