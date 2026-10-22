/**
 * Type definitions for AURA Smart Home
 */

export interface LightDevice {
  id: 'living_room_light' | 'bedroom_light';
  name: string;
  on: boolean;
  brightness: number;
  type: 'light';
}

export interface ClimateDevice {
  id: 'thermostat';
  name: string;
  target_temp: number;
  current_temp: number;
  mode: 'heat' | 'cool' | 'off';
  type: 'climate';
}

export interface SecurityDevice {
  id: 'front_door';
  name: string;
  locked: boolean;
  type: 'security';
}

export interface HomeState {
  devices: {
    living_room_light: LightDevice;
    bedroom_light: LightDevice;
    thermostat: ClimateDevice;
    front_door: SecurityDevice;
  };
  last_updated: string;
}

export type EventType =
  | 'user_request'
  | 'intent_interpretation'
  | 'tool_call'
  | 'tool_result'
  | 'state_verification'
  | 'clarification_required'
  | 'confirmation_required'
  | 'assistant_response'
  | 'error';

export interface ExecutionEvent {
  id: string;
  timestamp: string;
  type: EventType;
  message: string;
  tool?: string | null;
  arguments?: Record<string, any> | null;
  success?: boolean;
  result?: any | null;
}

export interface PendingAction {
  token: string;
  description: string;
  expires_in_seconds: number;
  action: string;
}

export interface ChatResponse {
  response: string;
  home_state: HomeState;
  events: ExecutionEvent[];
  confirmation_required?: boolean;
  pending_action?: PendingAction | null;
  mode: 'gemini' | 'local_fallback';
  request_id: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  gemini_configured: boolean;
  model: string | null;
  mode: 'gemini' | 'local_fallback';
  simulation: boolean;
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  pendingAction?: PendingAction | null;
  events?: ExecutionEvent[];
  mode?: 'gemini' | 'local_fallback';
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
}
