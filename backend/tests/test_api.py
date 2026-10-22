"""API endpoint integration tests."""
import unittest
import json
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from app import create_app
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False

from home.state import home_state_manager

class TestApiEndpoints(unittest.TestCase):
    def setUp(self):
        if not HAS_FLASK:
            self.skipTest("Flask is not installed in current environment; run with virtualenv to test Flask API.")
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        home_state_manager.reset_state()

    def tearDown(self):
        home_state_manager.reset_state()

    def test_health_endpoint_no_secrets(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("mode", data)
        self.assertIn("gemini_configured", data)
        # Ensure secret keys are NEVER exposed
        body_str = response.get_data(as_text=True)
        self.assertNotIn("AIza", body_str)
        self.assertNotIn("GEMINI_API_KEY", body_str)
        self.assertNotIn("replace_with_your_own_key", body_str)

    def test_get_home_state(self):
        response = self.client.get("/api/home")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("devices", data)
        devices = data["devices"]
        self.assertIn("living_room_light", devices)
        self.assertIn("bedroom_light", devices)
        self.assertIn("thermostat", devices)
        self.assertIn("front_door", devices)

    def test_reset_home_state(self):
        # Modify something first
        home_state_manager.update_light("bedroom_light", on=True, brightness=90)
        response = self.client.post("/api/home/reset")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        # Check that bedroom light is reset to off
        self.assertFalse(data["home_state"]["devices"]["bedroom_light"]["on"])
        self.assertEqual(data["home_state"]["devices"]["bedroom_light"]["brightness"], 0)

    def test_chat_validation_empty_body(self):
        response = self.client.post(
            "/api/assistant/chat",
            data="{}",
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())

    def test_chat_validation_blank_message(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "   "}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("blank", response.get_json()["error"])

    def test_chat_validation_exceeds_max_length(self):
        long_message = "turn on light " * 50  # > 500 chars
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": long_message}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("maximum allowed length", response.get_json()["error"])

    def test_chat_valid_single_command(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "turn off the living room light"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("response", data)
        self.assertIn("home_state", data)
        self.assertIn("events", data)
        self.assertIsInstance(data["events"], list)
        self.assertFalse(data["home_state"]["devices"]["living_room_light"]["on"])

    def test_chat_unlock_door_requires_confirmation(self):
        response = self.client.post(
            "/api/assistant/chat",
            json={"message": "unlock the front door"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("confirmation_required"))
        self.assertIsNotNone(data.get("pending_action"))
        token = data["pending_action"]["token"]

        # Door must still be locked
        home_state = data["home_state"]["devices"]["front_door"]
        self.assertTrue(home_state["locked"])

        # Now confirm with token
        confirm_res = self.client.post(
            "/api/home/confirm",
            json={"token": token}
        )
        self.assertEqual(confirm_res.status_code, 200)
        confirm_data = confirm_res.get_json()
        self.assertTrue(confirm_data["success"])
        self.assertFalse(confirm_data["home_state"]["devices"]["front_door"]["locked"])

    def test_confirm_invalid_and_reused_token(self):
        # 1. Non-existent token
        res_bad = self.client.post(
            "/api/home/confirm",
            json={"token": "sec_cf_invalidtoken123"}
        )
        self.assertEqual(res_bad.status_code, 403)

        # 2. Valid token then reuse
        chat_res = self.client.post(
            "/api/assistant/chat",
            json={"message": "please unlock the door"}
        )
        token = chat_res.get_json()["pending_action"]["token"]

        res_ok = self.client.post("/api/home/confirm", json={"token": token})
        self.assertEqual(res_ok.status_code, 200)

        # Reuse must fail
        res_reuse = self.client.post("/api/home/confirm", json={"token": token})
        self.assertEqual(res_reuse.status_code, 403)

if __name__ == "__main__":
    unittest.main()
