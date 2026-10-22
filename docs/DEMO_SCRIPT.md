# AURA Demonstration Script (Under 3 Minutes)

This script provides a concise walkthrough demonstrating AURA's core capabilities: natural language intent interpretation, multi-tool function calling, execution inspection, security confirmation challenges, and voice input.

---

### Segment 1: Introduction (0:00 - 0:30)

- **Visual**: Show the AURA 3-column dashboard: Left (Conversational Agent), Center (Simulated Residence), Right (Execution Inspector).
- **Spoken**:
  > *"Welcome to AURA, an Alexa+-style context-aware smart home agent. AURA pairs natural-language understanding with an authoritative, strictly verified simulated home environment.
  > Notice the three panels: our conversational agent on the left, live smart home devices in the center, and the real-time execution inspector on the right, which audits every tool call, argument, and verified state change without any fabricated telemetry."*

---

### Segment 2: Single Tool Execution & Inspector Inspection (0:30 - 1:00)

- **Action**: Type or click example: `"Turn off the living room light"`.
- **Visual**: Watch the assistant respond, the Living Room light card transition to OFF (0% brightness), and the inspector populate with `user_request`, `intent_interpretation`, `tool_call (update_lighting)`, `tool_result`, `state_verification`, and `assistant_response`.
- **Spoken**:
  > *"Let's start with a simple command: 'Turn off the living room light'.
  > Gemini selects the `update_lighting` tool. The backend validates the arguments, turns off the light, and verifies the change before reporting back. In the inspector on the right, we can expand the JSON arguments and results to see the verified payload."*

---

### Segment 3: Compound Command Execution (1:00 - 1:45)

- **Action**: Enter compound command:
  `"Dim the living room light to 30%, set the temperature to 26 degrees, and lock the front door"`
- **Visual**: Show the model executing three simultaneous tool calls. Living room light dims to 30%, Thermostat warms to 26.0°C, and front door verifies locked.
- **Spoken**:
  > *"AURA truly shines with compound instructions. Watch as I ask it to: 'Dim the living room light to 30%, set the temperature to 26 degrees, and lock the front door'.
  > In a single round, the agent coordinates three distinct function calls: `update_lighting`, `set_thermostat`, and `set_door_lock`. Each is independently validated and verified on the backend, and AURA delivers an accurate summary of all three actions."*

---

### Segment 4: Security Confirmation Workflow (1:45 - 2:25)

- **Action**: Speak or type: `"Unlock the front door"`.
- **Visual**: The assistant issues a warning. The Security Authorization Challenge dialog pops up displaying the 60-second countdown and single-use challenge token (`sec_cf_...`). Click "Confirm & Unlock".
- **Spoken**:
  > *"Now let's examine physical security protection. When I ask AURA to 'Unlock the front door', it does not immediately open the perimeter lock.
  > Instead, it issues a security challenge requiring human authorization with a short-lived, single-use token.
  > Once I click 'Confirm & Unlock', the backend verifies the token and unlocks the door. If this token were expired or intercepted and reused, the backend would immediately reject it."*

---

### Segment 5: Routines & Browser Voice Recognition (2:25 - 2:55)

- **Action**: Click the microphone button and speak: `"Activate leaving home routine"`.
- **Visual**: Speech recognition captures voice text into composer, sends request, and all lights turn off, climate powers off, and door locks securely.
- **Spoken**:
  > *"AURA also supports browser speech recognition and composite routines. With one click or voice command: 'Activate leaving home routine', AURA powers off all lights, disables the HVAC system, and secures the entrance perimeter.
  > That is AURA: verifiable, secure, context-aware smart home control."*
