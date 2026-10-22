"""Agent orchestrator handling function-calling loop, tool dispatching, security checks, and local fallback parsing."""
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from config import config
from home.state import home_state_manager
from tools.lighting import execute_update_lighting
from tools.climate import execute_set_thermostat
from tools.security import execute_set_door_lock
from tools.routines import execute_run_home_routine
from .tool_definitions import GEMINI_TOOL_DECLARATIONS
from .gemini_agent import GeminiAgent

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    def __init__(self, gemini_agent: Optional[GeminiAgent] = None):
        self.agent = gemini_agent or GeminiAgent()
        self.registered_tools = {
            "get_home_status": self._tool_get_home_status,
            "update_lighting": self._tool_update_lighting,
            "set_thermostat": self._tool_set_thermostat,
            "set_door_lock": self._tool_set_door_lock,
            "run_home_routine": self._tool_run_home_routine
        }

    def _create_event(
        self,
        event_type: str,
        message: str,
        tool: Optional[str] = None,
        arguments: Optional[Dict[str, Any]] = None,
        success: bool = True,
        result: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Creates an immutable structured execution event with dynamic UUID and ISO-8601 timestamp."""
        return {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "message": message,
            "tool": tool,
            "arguments": arguments,
            "success": success,
            "result": result
        }

    def process_message(self, message: str, request_id: Optional[str] = None) -> Dict[str, Any]:
        """Entry point for processing user instructions."""
        request_id = request_id or f"req_{uuid.uuid4().hex[:8]}"
        events: List[Dict[str, Any]] = []

        # Event: user_request
        events.append(self._create_event(
            event_type="user_request",
            message=f"Received user request: \"{message}\"",
            result={"request_id": request_id, "raw_message": message}
        ))

        # Check if Gemini is configured and available
        if self.agent.is_available():
            try:
                return self._run_gemini_orchestration(message, request_id, events)
            except Exception as e:
                logger.warning(f"Gemini execution failed ({e}), falling back to deterministic local parsing")
                events.append(self._create_event(
                    event_type="error",
                    message=f"Gemini API request failed: {str(e)}. Transitioning to local fallback command mode.",
                    success=False,
                    result={"error_details": str(e)}
                ))
                return self._run_local_fallback(message, request_id, events, fallback_reason=f"Gemini API call failed ({str(e)})")
        else:
            return self._run_local_fallback(
                message,
                request_id,
                events,
                fallback_reason="Gemini API key is not configured or unavailable. Operating in local command mode."
            )

    def _execute_registered_tool(self, tool_name: str, args: Dict[str, Any], events: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        """Executes an allowlisted tool, verifies state, and produces structured events."""
        events.append(self._create_event(
            event_type="tool_call",
            message=f"Dispatching tool '{tool_name}'",
            tool=tool_name,
            arguments=args
        ))

        if tool_name not in self.registered_tools:
            err_result = {
                "success": False,
                "tool": tool_name,
                "arguments": args,
                "result": None,
                "error": f"Tool '{tool_name}' is not in the allowlist of registered tools."
            }
            events.append(self._create_event(
                event_type="error",
                message=f"Rejected call to unauthorized tool '{tool_name}'",
                tool=tool_name,
                arguments=args,
                success=False,
                result=err_result
            ))
            return err_result, None

        handler = self.registered_tools[tool_name]
        try:
            tool_res = handler(args)
            success = tool_res.get("success", False)
            pending_action = tool_res.get("pending_action")

            events.append(self._create_event(
                event_type="tool_result",
                message=f"Tool '{tool_name}' returned status={'success' if success else 'failed'}",
                tool=tool_name,
                arguments=args,
                success=success,
                result=tool_res.get("result") or {"error": tool_res.get("error")}
            ))

            # If confirmation required, record confirmation_required event
            if tool_res.get("confirmation_required"):
                events.append(self._create_event(
                    event_type="confirmation_required",
                    message="Security confirmation challenge generated for door unlock action.",
                    tool=tool_name,
                    arguments=args,
                    success=True,
                    result=pending_action
                ))
            elif success and tool_name != "get_home_status":
                # State verification event
                current_state = home_state_manager.get_state()
                events.append(self._create_event(
                    event_type="state_verification",
                    message=f"Authoritative home state verified after '{tool_name}'.",
                    tool=tool_name,
                    success=True,
                    result={"devices": current_state["devices"]}
                ))

            return tool_res, pending_action

        except Exception as ex:
            logger.error(f"Error executing tool {tool_name}: {ex}", exc_info=True)
            err_result = {
                "success": False,
                "tool": tool_name,
                "arguments": args,
                "result": None,
                "error": f"Internal tool execution error: {str(ex)}"
            }
            events.append(self._create_event(
                event_type="error",
                message=f"Exception during tool '{tool_name}': {str(ex)}",
                tool=tool_name,
                arguments=args,
                success=False,
                result=err_result
            ))
            return err_result, None

    # --- Allowlisted Tool Handlers ---
    def _tool_get_home_status(self, args: Dict[str, Any]) -> Dict[str, Any]:
        state = home_state_manager.get_state()
        return {
            "success": True,
            "tool": "get_home_status",
            "arguments": args,
            "result": state,
            "error": None
        }

    def _tool_update_lighting(self, args: Dict[str, Any]) -> Dict[str, Any]:
        return execute_update_lighting(
            device_id=args.get("device_id", ""),
            on=args.get("on"),
            brightness=args.get("brightness")
        )

    def _tool_set_thermostat(self, args: Dict[str, Any]) -> Dict[str, Any]:
        return execute_set_thermostat(
            target_temp=args.get("target_temp"),
            mode=args.get("mode")
        )

    def _tool_set_door_lock(self, args: Dict[str, Any]) -> Dict[str, Any]:
        return execute_set_door_lock(locked=args.get("locked"))

    def _tool_run_home_routine(self, args: Dict[str, Any]) -> Dict[str, Any]:
        return execute_run_home_routine(routine_id=args.get("routine_id", ""))

    # --- Gemini Multi-turn Function Calling Loop ---
    def _run_gemini_orchestration(self, message: str, request_id: str, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        from google.genai import types

        events.append(self._create_event(
            event_type="intent_interpretation",
            message=f"Interpreting intent via Gemini ({self.agent.model_name}).",
            result={"model": self.agent.model_name, "mode": "gemini"}
        ))

        contents: List[Any] = [types.Content(role="user", parts=[types.Part.from_text(text=message)])]
        confirmation_needed = False
        pending_action_record = None
        rounds = 0

        while rounds < config.MAX_TOOL_CALL_ROUNDS:
            rounds += 1
            response = self.agent.call_gemini(contents=contents, tools=GEMINI_TOOL_DECLARATIONS)

            # Check if candidates exist
            if not response.candidates or not response.candidates[0].content:
                break

            candidate = response.candidates[0]
            model_content = candidate.content
            contents.append(model_content)

            # Inspect parts for function calls
            function_calls = []
            for part in model_content.parts:
                if part.function_call:
                    function_calls.append(part.function_call)

            if not function_calls:
                # No more tools called; model produced final text response
                final_text = "".join([p.text for p in model_content.parts if p.text])
                events.append(self._create_event(
                    event_type="assistant_response",
                    message="Assistant response formulated.",
                    result={"text": final_text}
                ))
                return {
                    "response": final_text or "Task executed successfully.",
                    "home_state": home_state_manager.get_state(),
                    "events": events,
                    "confirmation_required": confirmation_needed,
                    "pending_action": pending_action_record,
                    "mode": "gemini",
                    "request_id": request_id
                }

            # Execute each function call
            response_parts = []
            for fc in function_calls:
                call_name = fc.name
                call_args = dict(fc.args) if fc.args else {}

                tool_res, pending_action = self._execute_registered_tool(call_name, call_args, events)
                if pending_action:
                    confirmation_needed = True
                    pending_action_record = pending_action

                # Format function response part for next turn
                response_parts.append(types.Part.from_function_response(
                    name=call_name,
                    response={"result": tool_res}
                ))

            # Append function responses as role="user" content
            contents.append(types.Content(role="user", parts=response_parts))

        # Fallback if loop reached limit
        final_state = home_state_manager.get_state()
        return {
            "response": "I executed the requested home actions.",
            "home_state": final_state,
            "events": events,
            "confirmation_required": confirmation_needed,
            "pending_action": pending_action_record,
            "mode": "gemini",
            "request_id": request_id
        }

    # --- Deterministic Local Fallback Parser ---
    def _run_local_fallback(
        self,
        message: str,
        request_id: str,
        events: List[Dict[str, Any]],
        fallback_reason: str
    ) -> Dict[str, Any]:
        events.append(self._create_event(
            event_type="intent_interpretation",
            message=f"Local deterministic command parsing active. Reason: {fallback_reason}",
            result={"mode": "local_fallback", "reason": fallback_reason}
        ))

        cleaned = message.lower().strip()
        # Split compound requests on delimiters
        clauses = [c.strip() for c in re.split(r'[,;]|\band\b|\bthen\b', cleaned) if c.strip()]
        
        executed_summaries: List[str] = []
        confirmation_needed = False
        pending_action_record = None

        for clause in clauses:
            # 1. Routines
            if "leaving home" in clause or "leave home" in clause:
                res, _ = self._execute_registered_tool("run_home_routine", {"routine_id": "leaving_home"}, events)
                executed_summaries.append("Activated Leaving Home routine")
            elif "relaxing evening" in clause or "relax evening" in clause:
                res, _ = self._execute_registered_tool("run_home_routine", {"routine_id": "relaxing_evening"}, events)
                executed_summaries.append("Activated Relaxing Evening routine")
            elif "good morning" in clause or "morning routine" in clause:
                res, _ = self._execute_registered_tool("run_home_routine", {"routine_id": "good_morning"}, events)
                executed_summaries.append("Activated Good Morning routine")
            elif "secure home" in clause or "lock down" in clause:
                res, _ = self._execute_registered_tool("run_home_routine", {"routine_id": "secure_home"}, events)
                executed_summaries.append("Activated Secure Home routine")

            # 2. Door Lock
            elif "unlock" in clause and ("door" in clause or "front" in clause):
                res, pending = self._execute_registered_tool("set_door_lock", {"locked": False}, events)
                confirmation_needed = True
                pending_action_record = pending
                executed_summaries.append("Requested to unlock front door (confirmation required)")
            elif "lock" in clause and ("door" in clause or "front" in clause):
                res, _ = self._execute_registered_tool("set_door_lock", {"locked": True}, events)
                executed_summaries.append("Locked front door")

            # 3. Climate / Thermostat
            elif any(k in clause for k in ["thermostat", "temperature", "temp", "degrees", "heat", "cool"]):
                temp_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:degrees|c|°c)?', clause)
                target_temp = float(temp_match.group(1)) if temp_match else None
                
                mode = None
                if "cool" in clause or "ac" in clause or "air conditioning" in clause:
                    mode = "cool"
                elif "heat" in clause or "warm" in clause:
                    mode = "heat"
                elif "off" in clause:
                    mode = "off"

                args: Dict[str, Any] = {}
                if target_temp is not None and 16.0 <= target_temp <= 30.0:
                    args["target_temp"] = target_temp
                if mode:
                    args["mode"] = mode

                if args:
                    res, _ = self._execute_registered_tool("set_thermostat", args, events)
                    executed_summaries.append(f"Set thermostat ({', '.join(f'{k}={v}' for k, v in args.items())})")
                else:
                    events.append(self._create_event(
                        event_type="clarification_required",
                        message=f"Could not parse thermostat parameters from: '{clause}'",
                        success=False
                    ))

            # 4. Lighting
            elif any(k in clause for k in ["light", "lights", "lamp", "dim", "brighten"]):
                # Determine device
                device_id = "bedroom_light" if "bedroom" in clause else "living_room_light"
                
                # Brightness
                pct_match = re.search(r'(\d+)\s*%', clause) or re.search(r'(?:to|at)\s*(\d+)', clause)
                brightness = int(pct_match.group(1)) if pct_match else None

                on_state = None
                if "off" in clause:
                    on_state = False
                    brightness = 0
                elif "on" in clause:
                    on_state = True
                elif brightness is not None:
                    on_state = brightness > 0

                light_args: Dict[str, Any] = {"device_id": device_id}
                if on_state is not None:
                    light_args["on"] = on_state
                if brightness is not None:
                    light_args["brightness"] = brightness

                res, _ = self._execute_registered_tool("update_lighting", light_args, events)
                device_name = "Bedroom light" if device_id == "bedroom_light" else "Living room light"
                executed_summaries.append(f"Updated {device_name}")

            # 5. Status query
            elif any(k in clause for k in ["status", "how is", "check", "state"]):
                res, _ = self._execute_registered_tool("get_home_status", {}, events)
                executed_summaries.append("Inspected current home status")

        if not executed_summaries:
            response_text = (
                "Local mode is active. Supported commands include controlling lights (e.g., 'turn off living room light', 'dim bedroom to 30%'), "
                "adjusting the thermostat (e.g., 'set temperature to 22 degrees', 'set climate to cool'), "
                "locking the door ('lock front door', 'unlock front door'), or triggering routines ('leaving home', 'relaxing evening')."
            )
            events.append(self._create_event(
                event_type="clarification_required",
                message="No matching command found in local fallback mode.",
                success=False
            ))
        else:
            response_text = "I've processed your request: " + "; ".join(executed_summaries) + "."
            if confirmation_needed:
                response_text += " Note: Unlocking the front door requires your explicit confirmation."

        events.append(self._create_event(
            event_type="assistant_response",
            message="Formulated response in local fallback mode.",
            result={"text": response_text, "mode": "local_fallback"}
        ))

        return {
            "response": response_text,
            "home_state": home_state_manager.get_state(),
            "events": events,
            "confirmation_required": confirmation_needed,
            "pending_action": pending_action_record,
            "mode": "local_fallback",
            "request_id": request_id
        }
