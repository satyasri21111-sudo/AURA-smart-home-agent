"""Tool declarations for the Gemini Function Calling interface."""

GEMINI_TOOL_DECLARATIONS = [
    {
        "name": "get_home_status",
        "description": "Inspects and returns the current authoritative status of all smart home devices including lights, climate thermostat, and front door lock.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_lighting",
        "description": "Control a simulated light fixture. Can toggle power on/off or set brightness level between 0 and 100 percent.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "device_id": {
                    "type": "STRING",
                    "description": "The unique device identifier of the light fixture: 'living_room_light' or 'bedroom_light'."
                },
                "on": {
                    "type": "BOOLEAN",
                    "description": "Turn the light on (true) or off (false)."
                },
                "brightness": {
                    "type": "INTEGER",
                    "description": "Target brightness level between 0 (completely off) and 100 (full brightness)."
                }
            },
            "required": ["device_id"]
        }
    },
    {
        "name": "set_thermostat",
        "description": "Adjust the central smart thermostat target temperature in Celsius and/or HVAC operating mode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "target_temp": {
                    "type": "NUMBER",
                    "description": "Target room temperature in Celsius between 16.0 and 30.0 degrees."
                },
                "mode": {
                    "type": "STRING",
                    "description": "Operating mode for HVAC system: 'heat', 'cool', or 'off'."
                }
            },
            "required": []
        }
    },
    {
        "name": "set_door_lock",
        "description": "Lock or unlock the simulated front door. Locking locks immediately; unlocking requires human security challenge confirmation.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "locked": {
                    "type": "BOOLEAN",
                    "description": "Set to true to lock the front door; set to false to unlock it."
                }
            },
            "required": ["locked"]
        }
    },
    {
        "name": "run_home_routine",
        "description": "Execute a pre-configured multi-device smart home routine (leaving_home, relaxing_evening, good_morning, or secure_home).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "routine_id": {
                    "type": "STRING",
                    "description": "The routine to execute: 'leaving_home', 'relaxing_evening', 'good_morning', or 'secure_home'."
                }
            },
            "required": ["routine_id"]
        }
    }
]
