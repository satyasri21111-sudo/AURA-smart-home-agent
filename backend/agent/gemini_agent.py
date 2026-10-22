"""Gemini Agent client wrapper for official Google Gen AI SDK."""
import os
import json
import logging
from typing import Dict, Any, List, Optional
from config import config
from .tool_definitions import GEMINI_TOOL_DECLARATIONS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are AURA, an intelligent, context-aware smart-home agent.
You interpret human natural language commands, assess intent, and invoke appropriate smart home tools.
Rules:
1. Always use the provided tools to inspect status or perform actions on devices.
2. For compound commands (e.g. 'dim the living room light to 30%, set thermostat to 24°C, and lock the front door'), call all relevant tools.
3. Be truthful and concise in your final responses. Summarize what changed and note if any action required confirmation.
4. You cannot physically unlock the front door without user confirmation; if unlocking is requested, the system will challenge the user with a secure confirmation prompt.
5. If the user asks for status without specifying devices, call get_home_status.
6. Never fabricate tool outputs. Only speak based on actual tool execution results.
"""

class GeminiAgent:
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or config.GEMINI_API_KEY
        self.model_name = model_name or config.GEMINI_MODEL or "gemini-3.8-flash"
        self._client = None
        self._initialized = False

        if self.api_key and self.api_key != "replace_with_your_own_key":
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                self._initialized = True
            except Exception as e:
                logger.warning(f"Failed to initialize google.genai Client: {e}")
                self._client = None
                self._initialized = False

    def is_available(self) -> bool:
        return self._initialized and self._client is not None

    def call_gemini(self, contents: Any, tools: Optional[List[Dict[str, Any]]] = None) -> Any:
        """Invokes Gemini generate_content using modern google-genai SDK."""
        if not self.is_available():
            raise RuntimeError("Gemini client is not initialized or API key is not configured")

        from google.genai import types

        tool_objects = []
        if tools:
            # Wrap function declarations into types.Tool
            tool_objects = [types.Tool(function_declarations=tools)]

        generate_config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            tools=tool_objects if tool_objects else None
        )

        response = self._client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=generate_config
        )
        return response
