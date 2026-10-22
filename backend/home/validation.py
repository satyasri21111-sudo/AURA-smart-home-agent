"""Validation schemas and rules for simulated smart-home devices."""
from typing import Optional, Dict, Any, Tuple

class HomeValidation:
    VALID_LIGHT_IDS = {"living_room_light", "bedroom_light"}
    VALID_CLIMATE_MODES = {"heat", "cool", "off"}
    MIN_TEMP = 16.0
    MAX_TEMP = 30.0
    VALID_ROUTINES = {"leaving_home", "relaxing_evening", "good_morning", "secure_home"}

    @classmethod
    def validate_lighting(cls, device_id: str, on: Optional[bool] = None, brightness: Optional[int] = None) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """Validate lighting parameters.
        Returns (is_valid, error_message, sanitized_params).
        """
        if not device_id or device_id not in cls.VALID_LIGHT_IDS:
            return False, f"Invalid device_id '{device_id}'. Expected one of: {sorted(list(cls.VALID_LIGHT_IDS))}", {}

        sanitized: Dict[str, Any] = {"device_id": device_id}

        if brightness is not None:
            if not isinstance(brightness, (int, float)) or isinstance(brightness, bool):
                return False, "Brightness must be an integer between 0 and 100", {}
            brightness_int = int(brightness)
            if brightness_int < 0 or brightness_int > 100:
                return False, "Brightness must be an integer between 0 and 100", {}
            sanitized["brightness"] = brightness_int
            # Rule: brightness 0 means light is off; >0 means light is on
            if brightness_int == 0:
                sanitized["on"] = False
            else:
                sanitized["on"] = True

        if on is not None:
            if not isinstance(on, bool):
                return False, "'on' must be a boolean", {}
            sanitized["on"] = on
            # Rule: if explicitly turned off, brightness becomes 0
            if on is False and "brightness" not in sanitized:
                sanitized["brightness"] = 0

        if "on" not in sanitized and "brightness" not in sanitized:
            return False, "At least one of 'on' or 'brightness' must be specified", {}

        return True, None, sanitized

    @classmethod
    def validate_thermostat(cls, target_temp: Optional[float] = None, mode: Optional[str] = None) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """Validate climate/thermostat parameters.
        Returns (is_valid, error_message, sanitized_params).
        """
        sanitized: Dict[str, Any] = {}

        if target_temp is None and mode is None:
            return False, "At least one of 'target_temp' or 'mode' must be provided", {}

        if target_temp is not None:
            if not isinstance(target_temp, (int, float)) or isinstance(target_temp, bool):
                return False, f"target_temp must be a number between {cls.MIN_TEMP} and {cls.MAX_TEMP}°C", {}
            temp_val = round(float(target_temp), 1)
            if temp_val < cls.MIN_TEMP or temp_val > cls.MAX_TEMP:
                return False, f"target_temp {temp_val}°C is out of supported range [{cls.MIN_TEMP}, {cls.MAX_TEMP}]°C", {}
            sanitized["target_temp"] = temp_val

        if mode is not None:
            mode_clean = str(mode).lower().strip()
            if mode_clean not in cls.VALID_CLIMATE_MODES:
                return False, f"Invalid mode '{mode}'. Allowed values: {sorted(list(cls.VALID_CLIMATE_MODES))}", {}
            sanitized["mode"] = mode_clean

        return True, None, sanitized

    @classmethod
    def validate_door_lock(cls, locked: Any) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """Validate door lock parameters."""
        if not isinstance(locked, bool):
            return False, "'locked' must be a boolean (True to lock, False to unlock)", {}
        return True, None, {"locked": locked}

    @classmethod
    def validate_routine(cls, routine_id: str) -> Tuple[bool, Optional[str], str]:
        """Validate routine identifier."""
        if not routine_id or routine_id not in cls.VALID_ROUTINES:
            return False, f"Invalid routine_id '{routine_id}'. Supported routines: {sorted(list(cls.VALID_ROUTINES))}", ""
        return True, None, routine_id
