"""Climate tool execution with validation and state update."""
from typing import Dict, Any, Optional
from home.state import home_state_manager
from home.validation import HomeValidation

def execute_set_thermostat(target_temp: Optional[float] = None, mode: Optional[str] = None) -> Dict[str, Any]:
    """Updates thermostat temperature and/or mode on the simulated home.
    Strictly validates arguments before applying state changes.
    """
    is_valid, error_msg, sanitized = HomeValidation.validate_thermostat(target_temp, mode)
    if not is_valid:
        return {
            "success": False,
            "tool": "set_thermostat",
            "arguments": {"target_temp": target_temp, "mode": mode},
            "result": None,
            "error": error_msg
        }

    success, update_result = home_state_manager.update_thermostat(
        sanitized.get("target_temp"),
        sanitized.get("mode")
    )

    if not success:
        return {
            "success": False,
            "tool": "set_thermostat",
            "arguments": sanitized,
            "result": None,
            "error": update_result.get("error", "Failed to update thermostat")
        }

    return {
        "success": True,
        "tool": "set_thermostat",
        "arguments": sanitized,
        "result": {
            "device_id": "thermostat",
            "state": update_result["current"],
            "message": f"Thermostat set to {update_result['current']['target_temp']}°C in {update_result['current']['mode']} mode"
        },
        "error": None
    }
