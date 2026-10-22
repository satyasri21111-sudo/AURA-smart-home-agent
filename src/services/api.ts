/**
 * API service for communicating with AURA backend
 */
import { ChatResponse, HealthResponse, HomeState, ExecutionEvent } from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}: ${res.statusText}`, res.status, data.details);
  }
  return data as T;
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async getHomeState(): Promise<HomeState> {
    const res = await fetch(`${BASE_URL}/home`);
    return handleResponse<HomeState>(res);
  },

  async resetHomeState(): Promise<{ success: boolean; message: string; home_state: HomeState }> {
    const res = await fetch(`${BASE_URL}/home/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<{ success: boolean; message: string; home_state: HomeState }>(res);
  },

  async sendChatMessage(message: string, requestId?: string): Promise<ChatResponse> {
    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, request_id: requestId }),
    });
    return handleResponse<ChatResponse>(res);
  },

  async confirmSecurityAction(token: string): Promise<{ success: boolean; message: string; home_state: HomeState; events: ExecutionEvent[] }> {
    const res = await fetch(`${BASE_URL}/home/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return handleResponse<{ success: boolean; message: string; home_state: HomeState; events: ExecutionEvent[] }>(res);
  },
};
