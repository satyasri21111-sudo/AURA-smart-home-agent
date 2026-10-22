"""Home routines execution by composing existing validated tools."""
from typing import Dict, Any, List
from home.validation import HomeValidation
from .lighting import execute_update_lighting
from .climate import execute_set_thermostat
from .security import execute_set_door_lock

def execute_run_home_routine(routine_id: str) -> Dict[str, Any]:
    """Runs a composite smart-home routine by dispatching to standard validated tools."""
    is_valid, error_msg, sanitized_id = HomeValidation.validate_routine(routine_id)
    if not is_valid:
        return {
            "success": False,
            "tool": "run_home_routine",
            "arguments": {"routine_id": routine_id},
            "result": None,
            "error": error_msg
        }

    sub_actions: List[Dict[str, Any]] = []

    if sanitized_id == "leaving_home":
        # Turn off both lights, climate off, lock door
        sub_actions.append(execute_update_lighting("living_room_light", on=False, brightness=0))
        sub_actions.append(execute_update_lighting("bedroom_light", on=False, brightness=0))
        sub_actions.append(execute_set_thermostat(mode="off"))
        sub_actions.append(execute_set_door_lock(locked=True))
        routine_name = "Leaving Home"
        summary = "Turned off all lights, set climate to off, and locked the front door."

    elif sanitized_id == "relaxing_evening":
        # Living room light moderate (40%), bedroom off, comfortable heat 22°C
        sub_actions.append(execute_update_lighting("living_room_light", on=True, brightness=40))
        sub_actions.append(execute_update_lighting("bedroom_light", on=False, brightness=0))
        sub_actions.append(execute_set_thermostat(target_temp=22.0, mode="heat"))
        routine_name = "Relaxing Evening"
        summary = "Living room dimmed to 40%, bedroom light off, thermostat set to 22°C."

    elif sanitized_id == "good_morning":
        # Bedroom light 75%, living room 50%, climate 21°C heat
        sub_actions.append(execute_update_lighting("bedroom_light", on=True, brightness=75))
        sub_actions.append(execute_update_lighting("living_room_light", on=True, brightness=50))
        sub_actions.append(execute_set_thermostat(target_temp=21.0, mode="heat"))
        routine_name = "Good Morning"
        summary = "Bedroom light set to 75%, living room to 50%, and thermostat warmed to 21°C."

    elif sanitized_id == "secure_home":
        # Both lights off, climate off, front door locked
        sub_actions.append(execute_update_lighting("living_room_light", on=False, brightness=0))
        sub_actions.append(execute_update_lighting("bedroom_light", on=False, brightness=0))
        sub_actions.append(execute_set_thermostat(mode="off"))
        sub_actions.append(execute_set_door_lock(locked=True))
        routine_name = "Secure Home"
        summary = "Turned off lights, turned off climate system, and verified front door is securely locked."

    else:
        return {
            "success": False,
            "tool": "run_home_routine",
            "arguments": {"routine_id": routine_id},
            "result": None,
            "error": f"Unknown routine: {routine_id}"
        }

    all_successful = all(a.get("success", False) for a in sub_actions)

    return {
        "success": all_successful,
        "tool": "run_home_routine",
        "arguments": {"routine_id": sanitized_id},
        "result": {
            "routine_id": sanitized_id,
            "routine_name": routine_name,
            "summary": summary,
            "sub_actions": sub_actions
        },
        "error": None if all_successful else "One or more routine steps encountered an issue"
    }
