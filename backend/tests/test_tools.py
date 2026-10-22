"""Unit tests for smart-home tool execution and state validation."""
import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from home.state import home_state_manager
from home.validation import HomeValidation
from tools.lighting import execute_update_lighting
from tools.climate import execute_set_thermostat
from tools.security import execute_set_door_lock
from tools.routines import execute_run_home_routine

class TestSmartHomeTools(unittest.TestCase):
    def setUp(self):
        home_state_manager.reset_state()

    def tearDown(self):
        home_state_manager.reset_state()

    # --- Lighting Tests ---
    def test_lighting_turn_off_and_brightness_zero(self):
        res = execute_update_lighting("living_room_light", on=False)
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]["living_room_light"]
        self.assertFalse(state["on"])
        self.assertEqual(state["brightness"], 0)

    def test_lighting_set_brightness_updates_on_state(self):
        res = execute_update_lighting("bedroom_light", brightness=60)
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]["bedroom_light"]
        self.assertTrue(state["on"])
        self.assertEqual(state["brightness"], 60)

    def test_lighting_brightness_zero_turns_off(self):
        # First turn on
        execute_update_lighting("living_room_light", brightness=80)
        # Then set brightness 0
        res = execute_update_lighting("living_room_light", brightness=0)
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]["living_room_light"]
        self.assertFalse(state["on"])
        self.assertEqual(state["brightness"], 0)

    def test_lighting_invalid_device(self):
        res = execute_update_lighting("kitchen_chandelier", on=True)
        self.assertFalse(res["success"])
        self.assertIn("Invalid device_id", res["error"])

    def test_lighting_invalid_brightness_bounds(self):
        res = execute_update_lighting("living_room_light", brightness=150)
        self.assertFalse(res["success"])
        self.assertIn("between 0 and 100", res["error"])

        res_neg = execute_update_lighting("living_room_light", brightness=-10)
        self.assertFalse(res_neg["success"])

    # --- Climate Tests ---
    def test_thermostat_valid_temp_and_mode(self):
        res = execute_set_thermostat(target_temp=23.5, mode="cool")
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]["thermostat"]
        self.assertEqual(state["target_temp"], 23.5)
        self.assertEqual(state["mode"], "cool")

    def test_thermostat_boundary_temperatures(self):
        # 16.0 should be valid
        res_min = execute_set_thermostat(target_temp=16.0)
        self.assertTrue(res_min["success"])
        # 30.0 should be valid
        res_max = execute_set_thermostat(target_temp=30.0)
        self.assertTrue(res_max["success"])

        # 15.9 out of range
        res_low = execute_set_thermostat(target_temp=15.9)
        self.assertFalse(res_low["success"])
        self.assertIn("out of supported range", res_low["error"])

        # 30.1 out of range
        res_high = execute_set_thermostat(target_temp=30.1)
        self.assertFalse(res_high["success"])
        self.assertIn("out of supported range", res_high["error"])

    def test_thermostat_invalid_mode(self):
        res = execute_set_thermostat(mode="super_freeze")
        self.assertFalse(res["success"])
        self.assertIn("Invalid mode", res["error"])

    # --- Door Lock & Security Confirmation Tests ---
    def test_door_lock_can_lock_without_confirmation(self):
        # Unlock internally first to test locking
        home_state_manager.update_door_lock(locked=False)
        res = execute_set_door_lock(locked=True)
        self.assertTrue(res["success"])
        self.assertFalse(res.get("confirmation_required", False))
        state = home_state_manager.get_state()["devices"]["front_door"]
        self.assertTrue(state["locked"])

    def test_door_unlock_requires_confirmation_token(self):
        res = execute_set_door_lock(locked=False)
        self.assertTrue(res["success"])
        self.assertTrue(res.get("confirmation_required", False))
        self.assertIn("pending_action", res)
        self.assertTrue(res["pending_action"]["token"].startswith("sec_cf_"))
        
        # State MUST NOT be unlocked yet
        state = home_state_manager.get_state()["devices"]["front_door"]
        self.assertTrue(state["locked"])

    def test_consume_valid_confirmation_token(self):
        res = execute_set_door_lock(locked=False)
        token = res["pending_action"]["token"]

        valid, err, payload = home_state_manager.consume_confirmation_token(token)
        self.assertTrue(valid)
        self.assertEqual(payload["action"], "unlock_door")

    def test_reuse_confirmation_token_fails(self):
        res = execute_set_door_lock(locked=False)
        token = res["pending_action"]["token"]

        valid1, _, _ = home_state_manager.consume_confirmation_token(token)
        self.assertTrue(valid1)

        # Attempt reuse
        valid2, err2, _ = home_state_manager.consume_confirmation_token(token)
        self.assertFalse(valid2)
        self.assertIn("already consumed", err2)

    # --- Routine Tests ---
    def test_leaving_home_routine(self):
        res = execute_run_home_routine("leaving_home")
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]
        self.assertFalse(state["living_room_light"]["on"])
        self.assertFalse(state["bedroom_light"]["on"])
        self.assertEqual(state["thermostat"]["mode"], "off")
        self.assertTrue(state["front_door"]["locked"])

    def test_relaxing_evening_routine(self):
        res = execute_run_home_routine("relaxing_evening")
        self.assertTrue(res["success"])
        state = home_state_manager.get_state()["devices"]
        self.assertTrue(state["living_room_light"]["on"])
        self.assertEqual(state["living_room_light"]["brightness"], 40)
        self.assertFalse(state["bedroom_light"]["on"])
        self.assertEqual(state["thermostat"]["target_temp"], 22.0)

    def test_unknown_routine(self):
        res = execute_run_home_routine("party_disco_blast")
        self.assertFalse(res["success"])
        self.assertIn("Invalid routine_id", res["error"])

if __name__ == "__main__":
    unittest.main()
