"""Standalone Python test runner for AURA test suite."""
import unittest
import sys
import os

if __name__ == "__main__":
    test_dir = os.path.join(os.path.dirname(__file__), "tests")
    print(f"Discovering and running tests in: {test_dir}")
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=test_dir, pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
