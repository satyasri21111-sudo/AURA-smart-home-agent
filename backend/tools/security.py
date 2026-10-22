"""Security and door lock tool execution with confirmation safeguards."""
from typing import Dict, Any
from home.state import home_state_manager
from home.validation import HomeValidation

def execute_set_door_lock(locked: bool) -> Dict[str, Any]:
    """Updates door lock state.
    Note: Unlocking (locked=False) must trigger a security confirmation requirement
    unless verified via the explicit /api/home/confirm confirmation workflow.
    """
    is_valid, error_msg, sanitized = HomeValidation.validate_door_lock(locked)
    if not is_valid:
        return {
            "success": False,
            "tool": "set_door_lock",
            "arguments": {"locked": locked},
            "result": None,
            "error": error_msg
        }

    is_locked = sanitized["locked"]

    # Security check: Unlocking requires explicit user confirmation
    if not is_locked:
        # Generate short-lived secure pending confirmation token
        pending = home_state_manager.create_pending_confirmation(
            action="unlock_door",
            payload={"locked": False, "device_id": "front_door"},
            description="Unlock Front Door",
            expiry_seconds=60
        )
        return {
            "success": True,
            "confirmation_required": True,
            "tool": "set_door_lock",
            "arguments": sanitized,
            "pending_action": {
                "token": pending["token"],
                "description": pending["description"],
                "expires_in_seconds": pending["expires_in_seconds"],
                "action": pending["action"]
            },
            "result": {
                "status": "pending_confirmation",
                "message": "Unlocking the front door requires explicit security confirmation. A verification challenge has been issued."
            },
            "error": None
        }

    # Locking can proceed directly without confirmation
    success, update_result = home_state_manager.update_door_lock(locked=True)
    if not success:
        return {
            "success": False,
            "tool": "set_door_lock",
            "arguments": sanitized,
            "result": None,
            "error": update_result.get("error", "Failed to lock door")
        }

    return {
        "success": True,
        "confirmation_required": False,
        "tool": "set_door_lock",
        "arguments": sanitized,
        "result": {
            "device_id": "front_door",
            "state": update_result["current"],
            "message": "Front door has been securely locked"
        },
        "error": None
    }
