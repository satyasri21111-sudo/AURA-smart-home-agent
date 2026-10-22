import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const isGeminiAvailable = Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && GEMINI_API_KEY !== 'replace_with_your_own_key');

// Authoritative In-Memory State
interface LightDevice {
  id: string;
  name: string;
  on: boolean;
  brightness: number;
  type: 'light';
}

interface ClimateDevice {
  id: string;
  name: string;
  target_temp: number;
  current_temp: number;
  mode: 'heat' | 'cool' | 'off';
  type: 'climate';
}

interface SecurityDevice {
  id: string;
  name: string;
  locked: boolean;
  type: 'security';
}

interface HomeState {
  devices: {
    living_room_light: LightDevice;
    bedroom_light: LightDevice;
    thermostat: ClimateDevice;
    front_door: SecurityDevice;
  };
  last_updated: string;
}

const INITIAL_STATE: HomeState = {
  devices: {
    living_room_light: {
      id: 'living_room_light',
      name: 'Living Room Light',
      on: true,
      brightness: 80,
      type: 'light',
    },
    bedroom_light: {
      id: 'bedroom_light',
      name: 'Bedroom Light',
      on: false,
      brightness: 0,
      type: 'light',
    },
    thermostat: {
      id: 'thermostat',
      name: 'Main Thermostat',
      target_temp: 21.0,
      current_temp: 20.5,
      mode: 'heat',
      type: 'climate',
    },
    front_door: {
      id: 'front_door',
      name: 'Front Door',
      locked: true,
      type: 'security',
    },
  },
  last_updated: new Date().toISOString(),
};

let currentState: HomeState = JSON.parse(JSON.stringify(INITIAL_STATE));

interface PendingAction {
  token: string;
  action: string;
  payload: any;
  description: string;
  created_at: string;
  expires_at: number;
  expires_in_seconds: number;
}

const pendingConfirmations = new Map<string, PendingAction>();

function createPendingConfirmation(action: string, payload: any, description: string, expirySeconds = 60): PendingAction {
  const now = Date.now();
  // Clean expired
  for (const [t, data] of pendingConfirmations.entries()) {
    if (data.expires_at <= now) {
      pendingConfirmations.delete(t);
    }
  }

  const token = `sec_cf_${crypto.randomBytes(18).toString('hex')}`;
  const record: PendingAction = {
    token,
    action,
    payload,
    description,
    created_at: new Date().toISOString(),
    expires_at: now + expirySeconds * 1000,
    expires_in_seconds: expirySeconds,
  };
  pendingConfirmations.set(token, record);
  return record;
}

function consumeConfirmationToken(token: string): { valid: boolean; error?: string; data?: PendingAction } {
  if (!token || !pendingConfirmations.has(token)) {
    return { valid: false, error: 'Confirmation token not found, invalid, or already consumed' };
  }
  const record = pendingConfirmations.get(token)!;
  pendingConfirmations.delete(token);
  if (Date.now() > record.expires_at) {
    return { valid: false, error: 'Confirmation token has expired. Please request the action again.' };
  }
  return { valid: true, data: record };
}

// Structured Execution Event
export interface ExecutionEvent {
  id: string;
  timestamp: string;
  type:
    | 'user_request'
    | 'intent_interpretation'
    | 'tool_call'
    | 'tool_result'
    | 'state_verification'
    | 'clarification_required'
    | 'confirmation_required'
    | 'assistant_response'
    | 'error';
  message: string;
  tool?: string | null;
  arguments?: Record<string, any> | null;
  success?: boolean;
  result?: any | null;
}

function makeEvent(
  type: ExecutionEvent['type'],
  message: string,
  extra: Partial<ExecutionEvent> = {}
): ExecutionEvent {
  return {
    id: `evt_${crypto.randomUUID().slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    success: true,
    tool: null,
    arguments: null,
    result: null,
    ...extra,
  };
}

// Tool Implementation with Validation
function executeUpdateLighting(deviceId: string, on?: boolean, brightness?: number): { success: boolean; result?: any; error?: string } {
  if (deviceId !== 'living_room_light' && deviceId !== 'bedroom_light') {
    return { success: false, error: `Invalid device_id '${deviceId}'. Expected 'living_room_light' or 'bedroom_light'` };
  }

  const light = currentState.devices[deviceId];
  if (brightness !== undefined) {
    if (typeof brightness !== 'number' || isNaN(brightness) || brightness < 0 || brightness > 100) {
      return { success: false, error: 'Brightness must be an integer between 0 and 100' };
    }
    light.brightness = Math.round(brightness);
    light.on = light.brightness > 0;
  } else if (on !== undefined) {
    light.on = Boolean(on);
    if (!light.on) {
      light.brightness = 0;
    } else if (light.brightness === 0) {
      light.brightness = 75;
    }
  }

  currentState.last_updated = new Date().toISOString();
  return {
    success: true,
    result: {
      device_id: deviceId,
      state: { ...light },
      message: `Updated ${deviceId}: on=${light.on}, brightness=${light.brightness}%`,
    },
  };
}

function executeSetThermostat(targetTemp?: number, mode?: string): { success: boolean; result?: any; error?: string } {
  const thermostat = currentState.devices.thermostat;
  if (targetTemp === undefined && mode === undefined) {
    return { success: false, error: "At least one of 'target_temp' or 'mode' must be specified" };
  }

  if (targetTemp !== undefined) {
    if (typeof targetTemp !== 'number' || isNaN(targetTemp) || targetTemp < 16.0 || targetTemp > 30.0) {
      return { success: false, error: `target_temp must be between 16.0 and 30.0°C. Received: ${targetTemp}` };
    }
    thermostat.target_temp = Math.round(targetTemp * 10) / 10;
  }

  if (mode !== undefined) {
    const cleanMode = String(mode).toLowerCase().trim() as 'heat' | 'cool' | 'off';
    if (!['heat', 'cool', 'off'].includes(cleanMode)) {
      return { success: false, error: `Invalid mode '${mode}'. Allowed: 'heat', 'cool', 'off'` };
    }
    thermostat.mode = cleanMode;
  }

  currentState.last_updated = new Date().toISOString();
  return {
    success: true,
    result: {
      device_id: 'thermostat',
      state: { ...thermostat },
      message: `Thermostat set to ${thermostat.target_temp}°C in ${thermostat.mode} mode`,
    },
  };
}

function executeSetDoorLock(locked: boolean): { success: boolean; confirmation_required?: boolean; pending_action?: any; result?: any; error?: string } {
  if (typeof locked !== 'boolean') {
    return { success: false, error: "'locked' must be a boolean" };
  }

  if (!locked) {
    // Unlocking requires human confirmation challenge
    const pending = createPendingConfirmation('unlock_door', { locked: false }, 'Unlock Front Door', 60);
    return {
      success: true,
      confirmation_required: true,
      pending_action: {
        token: pending.token,
        description: pending.description,
        expires_in_seconds: pending.expires_in_seconds,
        action: pending.action,
      },
      result: {
        status: 'pending_confirmation',
        message: 'Unlocking the front door requires explicit confirmation.',
      },
    };
  }

  // Locking proceeds immediately
  currentState.devices.front_door.locked = true;
  currentState.last_updated = new Date().toISOString();
  return {
    success: true,
    confirmation_required: false,
    result: {
      device_id: 'front_door',
      state: { ...currentState.devices.front_door },
      message: 'Front door locked securely',
    },
  };
}

function executeRunRoutine(routineId: string): { success: boolean; result?: any; error?: string } {
  const cleanId = String(routineId).toLowerCase().trim();
  const subActions: any[] = [];

  if (cleanId === 'leaving_home') {
    subActions.push(executeUpdateLighting('living_room_light', false, 0));
    subActions.push(executeUpdateLighting('bedroom_light', false, 0));
    subActions.push(executeSetThermostat(undefined, 'off'));
    subActions.push(executeSetDoorLock(true));
    return {
      success: true,
      result: {
        routine_id: 'leaving_home',
        routine_name: 'Leaving Home',
        summary: 'Turned off all lights, set climate to off, and locked the front door.',
        sub_actions: subActions,
      },
    };
  }

  if (cleanId === 'relaxing_evening') {
    subActions.push(executeUpdateLighting('living_room_light', true, 40));
    subActions.push(executeUpdateLighting('bedroom_light', false, 0));
    subActions.push(executeSetThermostat(22.0, 'heat'));
    return {
      success: true,
      result: {
        routine_id: 'relaxing_evening',
        routine_name: 'Relaxing Evening',
        summary: 'Dimmed living room light to 40%, turned off bedroom light, and set thermostat to 22°C.',
        sub_actions: subActions,
      },
    };
  }

  if (cleanId === 'good_morning') {
    subActions.push(executeUpdateLighting('bedroom_light', true, 75));
    subActions.push(executeUpdateLighting('living_room_light', true, 50));
    subActions.push(executeSetThermostat(21.0, 'heat'));
    return {
      success: true,
      result: {
        routine_id: 'good_morning',
        routine_name: 'Good Morning',
        summary: 'Turned bedroom light to 75%, living room light to 50%, and warmed home to 21°C.',
        sub_actions: subActions,
      },
    };
  }

  if (cleanId === 'secure_home') {
    subActions.push(executeUpdateLighting('living_room_light', false, 0));
    subActions.push(executeUpdateLighting('bedroom_light', false, 0));
    subActions.push(executeSetThermostat(undefined, 'off'));
    subActions.push(executeSetDoorLock(true));
    return {
      success: true,
      result: {
        routine_id: 'secure_home',
        routine_name: 'Secure Home',
        summary: 'Turned off all lights, powered off climate control, and secured front door lock.',
        sub_actions: subActions,
      },
    };
  }

  return {
    success: false,
    error: `Unknown routine '${routineId}'. Supported: 'leaving_home', 'relaxing_evening', 'good_morning', 'secure_home'`,
  };
}

// Master tool dispatcher
function dispatchTool(toolName: string, args: Record<string, any>, events: ExecutionEvent[]): { toolRes: any; pendingAction?: any } {
  events.push(makeEvent('tool_call', `Dispatching tool '${toolName}'`, { tool: toolName, arguments: args }));

  let toolRes: any;
  if (toolName === 'get_home_status') {
    toolRes = { success: true, result: JSON.parse(JSON.stringify(currentState)) };
  } else if (toolName === 'update_lighting') {
    toolRes = executeUpdateLighting(args.device_id, args.on, args.brightness);
  } else if (toolName === 'set_thermostat') {
    toolRes = executeSetThermostat(args.target_temp, args.mode);
  } else if (toolName === 'set_door_lock') {
    toolRes = executeSetDoorLock(args.locked);
  } else if (toolName === 'run_home_routine') {
    toolRes = executeRunRoutine(args.routine_id);
  } else {
    toolRes = { success: false, error: `Tool '${toolName}' is not recognized or not allowlisted.` };
    events.push(makeEvent('error', `Rejected call to unauthorized tool '${toolName}'`, { tool: toolName, success: false, result: toolRes }));
    return { toolRes };
  }

  const success = Boolean(toolRes.success);
  events.push(
    makeEvent('tool_result', `Tool '${toolName}' returned ${success ? 'success' : 'failure'}`, {
      tool: toolName,
      arguments: args,
      success,
      result: toolRes.result || { error: toolRes.error },
    })
  );

  if (toolRes.confirmation_required) {
    events.push(
      makeEvent('confirmation_required', 'Security confirmation challenge issued for door unlock', {
        tool: toolName,
        arguments: args,
        result: toolRes.pending_action,
      })
    );
  } else if (success && toolName !== 'get_home_status') {
    events.push(
      makeEvent('state_verification', `Authoritative home state verified after '${toolName}'`, {
        tool: toolName,
        result: { devices: JSON.parse(JSON.stringify(currentState.devices)) },
      })
    );
  }

  return { toolRes, pendingAction: toolRes.pending_action };
}

// Deterministic Local Fallback Parser
function runLocalFallback(message: string, requestId: string, events: ExecutionEvent[], reason: string) {
  events.push(
    makeEvent('intent_interpretation', `Local command parsing active (${reason})`, {
      result: { mode: 'local_fallback', reason },
    })
  );

  const lower = message.toLowerCase();
  const clauses = lower.split(/[,;]|\band\b|\bthen\b/).map((c) => c.trim()).filter(Boolean);
  const executedSummaries: string[] = [];
  let confirmationNeeded = false;
  let pendingActionRecord: any = null;

  for (const clause of clauses) {
    // 1. Routines
    if (clause.includes('leaving home') || clause.includes('leave home')) {
      const { toolRes } = dispatchTool('run_home_routine', { routine_id: 'leaving_home' }, events);
      if (toolRes.success) executedSummaries.push('Activated Leaving Home routine');
    } else if (clause.includes('relaxing evening') || clause.includes('relax evening')) {
      const { toolRes } = dispatchTool('run_home_routine', { routine_id: 'relaxing_evening' }, events);
      if (toolRes.success) executedSummaries.push('Activated Relaxing Evening routine');
    } else if (clause.includes('good morning') || clause.includes('morning routine')) {
      const { toolRes } = dispatchTool('run_home_routine', { routine_id: 'good_morning' }, events);
      if (toolRes.success) executedSummaries.push('Activated Good Morning routine');
    } else if (clause.includes('secure home') || clause.includes('lock down')) {
      const { toolRes } = dispatchTool('run_home_routine', { routine_id: 'secure_home' }, events);
      if (toolRes.success) executedSummaries.push('Activated Secure Home routine');
    }
    // 2. Door
    else if (clause.includes('unlock') && (clause.includes('door') || clause.includes('front'))) {
      const { pendingAction } = dispatchTool('set_door_lock', { locked: false }, events);
      confirmationNeeded = true;
      pendingActionRecord = pendingAction;
      executedSummaries.push('Requested to unlock front door (confirmation required)');
    } else if (clause.includes('lock') && (clause.includes('door') || clause.includes('front'))) {
      const { toolRes } = dispatchTool('set_door_lock', { locked: true }, events);
      if (toolRes.success) executedSummaries.push('Locked front door');
    }
    // 3. Climate
    else if (clause.includes('thermostat') || clause.includes('temperature') || clause.includes('temp') || clause.includes('degrees') || clause.includes('heat') || clause.includes('cool')) {
      const tempMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:degrees|c|°c)?/);
      const targetTemp = tempMatch ? parseFloat(tempMatch[1]) : undefined;
      let mode: string | undefined;
      if (clause.includes('cool') || clause.includes('ac')) mode = 'cool';
      else if (clause.includes('heat') || clause.includes('warm')) mode = 'heat';
      else if (clause.includes('off')) mode = 'off';

      const args: any = {};
      if (targetTemp !== undefined && targetTemp >= 16 && targetTemp <= 30) args.target_temp = targetTemp;
      if (mode) args.mode = mode;

      if (Object.keys(args).length > 0) {
        const { toolRes } = dispatchTool('set_thermostat', args, events);
        if (toolRes.success) executedSummaries.push(`Adjusted thermostat`);
      }
    }
    // 4. Lighting
    else if (clause.includes('light') || clause.includes('dim') || clause.includes('brighten') || clause.includes('lamp')) {
      const deviceId = clause.includes('bedroom') ? 'bedroom_light' : 'living_room_light';
      const pctMatch = clause.match(/(\d+)\s*%/);
      const toMatch = clause.match(/(?:to|at)\s*(\d+)/);
      const num = pctMatch ? parseInt(pctMatch[1], 10) : toMatch ? parseInt(toMatch[1], 10) : undefined;

      let onState: boolean | undefined;
      let brightness: number | undefined;

      if (clause.includes('off')) {
        onState = false;
        brightness = 0;
      } else if (clause.includes('on')) {
        onState = true;
      }

      if (num !== undefined) {
        brightness = num;
        onState = brightness > 0;
      }

      const lightArgs: any = { device_id: deviceId };
      if (onState !== undefined) lightArgs.on = onState;
      if (brightness !== undefined) lightArgs.brightness = brightness;

      const { toolRes } = dispatchTool('update_lighting', lightArgs, events);
      if (toolRes.success) {
        executedSummaries.push(`Updated ${deviceId === 'bedroom_light' ? 'bedroom light' : 'living room light'}`);
      }
    }
    // 5. Status
    else if (clause.includes('status') || clause.includes('check') || clause.includes('state')) {
      dispatchTool('get_home_status', {}, events);
      executedSummaries.push('Checked current home status');
    }
  }

  let responseText = '';
  if (executedSummaries.length === 0) {
    responseText =
      "Local command mode is active. You can say 'turn off living room light', 'set temperature to 23 degrees', 'lock front door', or trigger routines like 'leaving home'.";
    events.push(makeEvent('clarification_required', 'No recognized command found in local mode', { success: false }));
  } else {
    responseText = `I've executed your request: ${executedSummaries.join('; ')}.`;
    if (confirmationNeeded) {
      responseText += ' Note: Unlocking the front door requires your confirmation.';
    }
  }

  events.push(makeEvent('assistant_response', 'Assistant response formulated in local fallback mode', { result: { text: responseText } }));

  return {
    response: responseText,
    home_state: JSON.parse(JSON.stringify(currentState)),
    events,
    confirmation_required: confirmationNeeded,
    pending_action: pendingActionRecord,
    mode: 'local_fallback',
    request_id: requestId,
  };
}

// Tool definitions for Gemini
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_home_status',
        description: 'Returns the current state of all simulated home devices.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'update_lighting',
        description: 'Update power state or brightness for living_room_light or bedroom_light.',
        parameters: {
          type: 'OBJECT',
          properties: {
            device_id: { type: 'STRING', description: "'living_room_light' or 'bedroom_light'" },
            on: { type: 'BOOLEAN', description: 'Turn light on (true) or off (false)' },
            brightness: { type: 'INTEGER', description: 'Brightness level from 0 to 100' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'set_thermostat',
        description: 'Set target temperature in Celsius (16 to 30) or mode (heat, cool, off).',
        parameters: {
          type: 'OBJECT',
          properties: {
            target_temp: { type: 'NUMBER', description: 'Target temperature in Celsius (16.0 to 30.0)' },
            mode: { type: 'STRING', description: "'heat', 'cool', or 'off'" },
          },
        },
      },
      {
        name: 'set_door_lock',
        description: 'Set front door lock state. True to lock, false to unlock.',
        parameters: {
          type: 'OBJECT',
          properties: {
            locked: { type: 'BOOLEAN', description: 'True to lock, false to unlock' },
          },
          required: ['locked'],
        },
      },
      {
        name: 'run_home_routine',
        description: 'Run pre-configured routine: leaving_home, relaxing_evening, good_morning, or secure_home.',
        parameters: {
          type: 'OBJECT',
          properties: {
            routine_id: { type: 'STRING', description: "'leaving_home', 'relaxing_evening', 'good_morning', or 'secure_home'" },
          },
          required: ['routine_id'],
        },
      },
    ],
  },
];

const SYSTEM_PROMPT = `You are AURA, a simulated context-aware smart-home agent.
You interpret user instructions and call function tools to inspect or update simulated home devices.
Rules:
1. Always use function calls to perform actions or inspect status.
2. For compound commands, make all required tool calls.
3. Be concise and truthful in your final response summarizing what changed.
4. You cannot physically unlock the front door without user confirmation; the system will challenge the user.
5. Never fabricate tools or outputs. Speak only based on real tool returns.`;

// Middleware
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AURA Context-Aware Smart Home Agent',
    gemini_configured: isGeminiAvailable,
    model: isGeminiAvailable ? GEMINI_MODEL : null,
    mode: isGeminiAvailable ? 'gemini' : 'local_fallback',
    simulation: true,
  });
});

app.get('/api/home', (req, res) => {
  res.json(JSON.parse(JSON.stringify(currentState)));
});

app.post('/api/home/reset', (req, res) => {
  currentState = JSON.parse(JSON.stringify(INITIAL_STATE));
  currentState.last_updated = new Date().toISOString();
  pendingConfirmations.clear();
  res.json({
    success: true,
    message: 'Home state restored to initial demo configuration',
    home_state: JSON.parse(JSON.stringify(currentState)),
  });
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, request_id } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Field 'message' is required and must be a string." });
    }
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: "Field 'message' cannot be blank." });
    }
    if (cleanMessage.length > 500) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 500 characters.' });
    }

    const reqId = request_id || `req_${crypto.randomUUID().slice(0, 8)}`;
    const events: ExecutionEvent[] = [
      makeEvent('user_request', `Received user request: "${cleanMessage}"`, { result: { request_id: reqId, raw_message: cleanMessage } }),
    ];

    if (!isGeminiAvailable) {
      const fallbackResult = runLocalFallback(cleanMessage, reqId, events, 'Gemini API key not configured');
      return res.json(fallbackResult);
    }

    // Try Gemini function calling loop
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      events.push(
        makeEvent('intent_interpretation', `Interpreting intent via Gemini (${GEMINI_MODEL})`, {
          result: { model: GEMINI_MODEL, mode: 'gemini' },
        })
      );

      let contents: any[] = [{ role: 'user', parts: [{ text: cleanMessage }] }];
      let confirmationNeeded = false;
      let pendingActionRecord: any = null;
      let round = 0;
      let finalText = '';

      while (round < 5) {
        round++;
        const response: any = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2,
            tools: GEMINI_TOOLS as any,
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content) break;

        contents.push(candidate.content);
        const parts = candidate.content.parts || [];
        const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        if (functionCalls.length === 0) {
          finalText = parts.map((p: any) => p.text || '').join('');
          break;
        }

        const responseParts: any[] = [];
        for (const fc of functionCalls) {
          const { toolRes, pendingAction } = dispatchTool(fc.name, fc.args || {}, events);
          if (pendingAction) {
            confirmationNeeded = true;
            pendingActionRecord = pendingAction;
          }
          responseParts.push({
            functionResponse: {
              name: fc.name,
              response: { result: toolRes },
            },
          });
        }

        contents.push({ role: 'user', parts: responseParts });
      }

      if (finalText) {
        events.push(makeEvent('assistant_response', 'Assistant response formulated', { result: { text: finalText } }));
      }

      return res.json({
        response: finalText || 'Actions completed.',
        home_state: JSON.parse(JSON.stringify(currentState)),
        events,
        confirmation_required: confirmationNeeded,
        pending_action: pendingActionRecord,
        mode: 'gemini',
        request_id: reqId,
      });
    } catch (geminiError: any) {
      console.warn('Gemini call failed, falling back to local mode:', geminiError?.message);
      events.push(
        makeEvent('error', `Gemini request error: ${geminiError?.message || geminiError}. Running deterministic fallback.`, {
          success: false,
          result: { error: String(geminiError) },
        })
      );
      const fallbackResult = runLocalFallback(cleanMessage, reqId, events, 'Gemini API call failed');
      return res.json(fallbackResult);
    }
  } catch (err: any) {
    console.error('Server error in /api/assistant/chat:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
});

app.post('/api/home/confirm', (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: "Confirmation 'token' is required." });
  }

  const { valid, error, data } = consumeConfirmationToken(token.trim());
  if (!valid || !data) {
    return res.status(403).json({ success: false, error: error || 'Invalid token' });
  }

  if (data.action === 'unlock_door') {
    currentState.devices.front_door.locked = false;
    currentState.last_updated = new Date().toISOString();

    const confirmationEvent: ExecutionEvent = makeEvent(
      'state_verification',
      'Security token validated. Front door unlocked with human authorization.',
      {
        tool: 'set_door_lock',
        arguments: { locked: false },
        result: { status: 'unlocked', verified: true },
      }
    );

    return res.json({
      success: true,
      message: 'Front door unlocked successfully after confirmation.',
      home_state: JSON.parse(JSON.stringify(currentState)),
      events: [confirmationEvent],
    });
  }

  return res.status(400).json({ success: false, error: `Unrecognized action ${data.action}` });
});

// Vite Middleware Integration
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AURA] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[AURA] Gemini AI Mode: ${isGeminiAvailable ? 'ACTIVE' : 'LOCAL FALLBACK'}`);
  });
}

startServer();
