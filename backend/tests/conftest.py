"""Pytest fixtures for AURA smart home tests."""
import pytest
import sys
import os

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from home.state import home_state_manager

@pytest.fixture
def app():
    app = create_app()
    app.config.update({"TESTING": True})
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture(autouse=True)
def reset_home_state():
    """Reset home state before and after each test."""
    home_state_manager.reset_state()
    yield
    home_state_manager.reset_state()
