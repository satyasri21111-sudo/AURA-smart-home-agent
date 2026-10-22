"""Lighting tool execution with validation and state update."""
from typing import Dict, Any, Optional
from home.state import home_state_manager
from home.validation import HomeValidation

def execute_update_lighting(device_id: str, on: Optional[bool] = None, brightness: Optional[int] = None) -> Dict[str, Any]:
    """Updates lighting state on the simulated home.
    Strictly validates arguments before applying state changes.
    """
    is_valid, error_msg, sanitized = HomeValidation.validate_lighting(device_id, on, brightness)
    if not is_valid:
        return {
            "success": False,
            "tool": "update_lighting",
            "arguments": {"device_id": device_id, "on": on, "brightness": brightness},
            "result": None,
            "error": error_msg
        }

    success, update_result = home_state_manager.update_light(
        sanitized["device_id"],
        sanitized.get("on"),
        sanitized.get("brightness")
    )

    if not success:
        return {
            "success": False,
            "tool": "update_lighting",
            "arguments": sanitized,
            "result": None,
            "error": update_result.get("error", "Failed to update light")
        }

    return {
        "success": True,
        "tool": "update_lighting",
        "arguments": sanitized,
        "result": {
            "device_id": sanitized["device_id"],
            "state": update_result["current"],
            "message": f"Successfully updated {sanitized['device_id']} (on={update_result['current']['on']}, brightness={update_result['current']['brightness']}%)"
        },
        "error": None
    }
