"""AURA Smart Home Agent Flask API Server."""
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

from config import config
from home.state import home_state_manager
from agent.orchestrator import AgentOrchestrator
from agent.gemini_agent import GeminiAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("aura")

def create_app(test_config=None) -> Flask:
    app = Flask(__name__)
    
    # Configure CORS for frontend origins
    allowed_origins = [
        config.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    orchestrator = AgentOrchestrator()

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "details": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error", "details": "An unexpected error occurred"}), 500

    @app.route("/api/health", methods=["GET"])
    def get_health():
        """Health check endpoint. Never exposes secrets or API keys."""
        is_gemini_active = orchestrator.agent.is_available()
        return jsonify({
            "status": "healthy",
            "service": "AURA Context-Aware Smart Home Agent",
            "gemini_configured": is_gemini_active,
            "model": orchestrator.agent.model_name if is_gemini_active else None,
            "mode": "gemini" if is_gemini_active else "local_fallback",
            "simulation": True
        }), 200

    @app.route("/api/home", methods=["GET"])
    def get_home_state():
        """Returns the authoritative smart home state."""
        state = home_state_manager.get_state()
        return jsonify(state), 200

    @app.route("/api/home/reset", methods=["POST"])
    def reset_home_state():
        """Resets devices to the documented initial demo state."""
        state = home_state_manager.reset_state()
        return jsonify({
            "success": True,
            "message": "Home state successfully restored to initial demo conditions.",
            "home_state": state
        }), 200

    @app.route("/api/assistant/chat", methods=["POST"])
    def chat_with_assistant():
        """Main interaction endpoint for voice or text instructions."""
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON body. Expected an object with 'message'."}), 400

        message = data.get("message")
        if not message or not isinstance(message, str):
            return jsonify({"error": "Field 'message' is required and must be a non-empty string."}), 400

        cleaned_message = message.strip()
        if len(cleaned_message) == 0:
            return jsonify({"error": "Field 'message' cannot be blank."}), 400

        if len(cleaned_message) > config.MAX_MESSAGE_LENGTH:
            return jsonify({
                "error": f"Message exceeds maximum allowed length of {config.MAX_MESSAGE_LENGTH} characters."
            }), 400

        request_id = data.get("request_id")
        result = orchestrator.process_message(cleaned_message, request_id=request_id)
        return jsonify(result), 200

    @app.route("/api/home/confirm", methods=["POST"])
    def confirm_action():
        """Confirms a pending security action using a single-use token."""
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON body. Expected 'token'."}), 400

        token = data.get("token")
        if not token or not isinstance(token, str):
            return jsonify({"error": "Confirmation 'token' is required and must be a string."}), 400

        # Validate and consume token
        valid, error_reason, pending_data = home_state_manager.consume_confirmation_token(token.strip())
        if not valid:
            return jsonify({
                "success": False,
                "error": error_reason or "Invalid confirmation token"
            }), 403

        # Execute only the server-bound action
        action_name = pending_data.get("action")
        if action_name == "unlock_door":
            success, update_result = home_state_manager.update_door_lock(locked=False)
            current_state = home_state_manager.get_state()
            
            # Emit verified confirmation event
            confirmation_event = {
                "id": f"evt_conf_{token[:8]}",
                "timestamp": current_state["last_updated"],
                "type": "state_verification",
                "message": "Security token validated. Front door unlocked with human authorization.",
                "tool": "set_door_lock",
                "arguments": {"locked": False},
                "success": True,
                "result": {"status": "unlocked", "verified": True}
            }
            
            return jsonify({
                "success": True,
                "message": "Security confirmation verified. Front door has been unlocked.",
                "home_state": current_state,
                "events": [confirmation_event]
            }), 200

        return jsonify({
            "success": False,
            "error": f"Unrecognized action '{action_name}' bound to token."
        }), 400

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=config.DEBUG)
