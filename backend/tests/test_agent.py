"""Agent orchestrator and tool orchestration tests."""
import unittest
import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from home.state import home_state_manager
from agent.orchestrator import AgentOrchestrator
from agent.gemini_agent import GeminiAgent

class TestAgentOrchestration(unittest.TestCase):
    def setUp(self):
        home_state_manager.reset_state()
        # Mock GeminiAgent to run deterministic local mode or mock responses
        self.mock_agent = MagicMock(spec=GeminiAgent)
        self.mock_agent.is_available.return_value = False
        self.mock_agent.model_name = "gemini-3.8-flash"
        self.orchestrator = AgentOrchestrator(gemini_agent=self.mock_agent)

    def tearDown(self):
        home_state_manager.reset_state()

    def test_compound_command_execution(self):
        """Integration test: compound request executing multiple tools."""
        command = "Dim living room light to 30%, set temperature to 26 degrees, and lock front door"
        res = self.orchestrator.process_message(command)
        
        self.assertIn("response", res)
        self.assertEqual(res["mode"], "local_fallback")
        
        # Verify state changes
        devices = res["home_state"]["devices"]
        self.assertEqual(devices["living_room_light"]["brightness"], 30)
        self.assertTrue(devices["living_room_light"]["on"])
        self.assertEqual(devices["thermostat"]["target_temp"], 26.0)
        self.assertTrue(devices["front_door"]["locked"])

        # Verify event timeline
        events = res["events"]
        event_types = [e["type"] for e in events]
        self.assertIn("user_request", event_types)
        self.assertIn("intent_interpretation", event_types)
        self.assertIn("tool_call", event_types)
        self.assertIn("tool_result", event_types)
        self.assertIn("state_verification", event_types)
        self.assertIn("assistant_response", event_types)

        # Verify event schema
        for event in events:
            self.assertTrue(event["id"].startswith("evt_"))
            self.assertIn("timestamp", event)
            self.assertIn("type", event)
            self.assertIn("message", event)

    def test_unauthorized_unknown_tool_rejection(self):
        events = []
        result, pending = self.orchestrator._execute_registered_tool(
            "delete_all_files",
            {"path": "/"},
            events
        )
        self.assertFalse(result["success"])
        self.assertIn("not in the allowlist", result["error"])
        self.assertIsNone(pending)
        
        err_events = [e for e in events if e["type"] == "error"]
        self.assertTrue(len(err_events) > 0)
        self.assertIn("unauthorized tool", err_events[0]["message"])

    def test_leaving_home_routine_execution(self):
        res = self.orchestrator.process_message("activate leaving home")
        devices = res["home_state"]["devices"]
        self.assertFalse(devices["living_room_light"]["on"])
        self.assertFalse(devices["bedroom_light"]["on"])
        self.assertEqual(devices["thermostat"]["mode"], "off")
        self.assertTrue(devices["front_door"]["locked"])

if __name__ == "__main__":
    unittest.main()
