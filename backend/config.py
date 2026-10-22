import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("FLASK_ENV") == "development"
    
    # Security confirmation expiration time in seconds
    CONFIRMATION_EXPIRY_SECONDS = 60
    
    # Maximum character length for chat input
    MAX_MESSAGE_LENGTH = 500
    
    # Orchestrator limits
    MAX_TOOL_CALL_ROUNDS = 5
    MAX_TOTAL_TOOL_CALLS = 10

config = Config()
