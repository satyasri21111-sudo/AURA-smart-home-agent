/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from './services/api';
import {
  HomeState,
  ExecutionEvent,
  MessageItem,
  HealthResponse,
  PendingAction,
  ToastMessage,
} from './types';
import { AppHeader } from './components/AppHeader';
import { AssistantPanel } from './components/AssistantPanel';
import { HomeDashboard } from './components/HomeDashboard';
import { ExecutionInspector } from './components/ExecutionInspector';
import { ConfirmActionDialog } from './components/ConfirmActionDialog';
import { Toast } from './components/Toast';
import { MessageSquare, LayoutDashboard, Terminal } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [homeState, setHomeState] = useState<HomeState | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [activePendingAction, setActivePendingAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'home' | 'inspector'>('home');

  const showToast = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    setToast({ id: `t_${Date.now()}`, type, title, description });
  }, []);

  // Fetch initial health and home state
  useEffect(() => {
    async function init() {
      try {
        const [healthData, stateData] = await Promise.all([
          api.getHealth(),
          api.getHomeState(),
        ]);
        setHealth(healthData);
        setHomeState(stateData);

        // Initial welcome message
        const welcomeMessage: MessageItem = {
          id: 'msg_welcome',
          sender: 'assistant',
          text:
            healthData.mode === 'gemini'
              ? `Hello! I am AURA, your context-aware smart home agent powered by Gemini function calling. I can manage your lighting, climate, security locks, and automated routines. Try asking me to dim the living room light or run a routine!`
              : `Hello! I am AURA. Operating in local command mode. Try issuing smart-home commands like "turn off living room light" or "set temperature to 22 degrees".`,
          timestamp: new Date().toISOString(),
          mode: healthData.mode,
        };
        setMessages([welcomeMessage]);
      } catch (err: any) {
        console.error('Failed to connect to backend:', err);
        showToast('error', 'Backend Connection Failed', 'Please verify the backend server is running on localhost port 5000 or port 3000.');
      }
    }
    init();
  }, [showToast]);

  // Main command sender
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: MessageItem = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(text.trim());
      
      // Update authoritative home state
      if (response.home_state) {
        setHomeState(response.home_state);
      }

      // Append backend events to inspector timeline
      if (response.events && response.events.length > 0) {
        setEvents((prev) => [...prev, ...response.events]);
      }

      // Check if security challenge was issued
      if (response.confirmation_required && response.pending_action) {
        setActivePendingAction(response.pending_action);
        showToast('warning', 'Confirmation Required', 'Unlocking the front door requires explicit authorization.');
      }

      // Append assistant response
      const assistantMessage: MessageItem = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        text: response.response,
        timestamp: new Date().toISOString(),
        pendingAction: response.pending_action,
        events: response.events,
        mode: response.mode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = err instanceof ApiError ? err.message : 'Failed to communicate with agent backend.';
      showToast('error', 'Command Failed', errMsg);

      const errMessage: MessageItem = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: `Error executing command: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Device control handlers that call validated backend tool actions
  const handleToggleLight = async (deviceId: string, currentOn: boolean) => {
    const lightName = deviceId === 'bedroom_light' ? 'bedroom light' : 'living room light';
    await handleSendMessage(currentOn ? `Turn off ${lightName}` : `Turn on ${lightName}`);
  };

  const handleChangeBrightness = async (deviceId: string, brightness: number) => {
    const lightName = deviceId === 'bedroom_light' ? 'bedroom light' : 'living room light';
    await handleSendMessage(`Set ${lightName} brightness to ${brightness}%`);
  };

  const handleChangeTemp = async (temp: number) => {
    await handleSendMessage(`Set thermostat temperature to ${temp} degrees`);
  };

  const handleChangeClimateMode = async (mode: 'heat' | 'cool' | 'off') => {
    await handleSendMessage(`Set climate mode to ${mode}`);
  };

  const handleLockDoor = async () => {
    await handleSendMessage('Lock the front door');
  };

  const handleTriggerUnlock = async () => {
    await handleSendMessage('Unlock the front door');
  };

  const handleRunRoutine = async (routineId: string) => {
    const routineMap: Record<string, string> = {
      leaving_home: 'Activate leaving home routine',
      relaxing_evening: 'Activate relaxing evening routine',
      good_morning: 'Activate good morning routine',
      secure_home: 'Activate secure home routine',
    };
    await handleSendMessage(routineMap[routineId] || `Run routine ${routineId}`);
  };

  // Confirm pending security challenge
  const handleConfirmAction = async (token: string) => {
    setConfirmLoading(true);
    try {
      const res = await api.confirmSecurityAction(token);
      if (res.success) {
        setHomeState(res.home_state);
        if (res.events) {
          setEvents((prev) => [...prev, ...res.events]);
        }
        showToast('success', 'Security Action Confirmed', res.message);
        setActivePendingAction(null);

        // Add confirmation message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_conf_${Date.now()}`,
            sender: 'assistant',
            text: res.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Confirmation error:', err);
      const errMsg = err instanceof ApiError ? err.message : 'Invalid or expired confirmation token.';
      showToast('error', 'Authorization Failed', errMsg);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Reset demo state
  const handleResetState = async () => {
    setResetLoading(true);
    try {
      const res = await api.resetHomeState();
      setHomeState(res.home_state);
      setActivePendingAction(null);
      showToast('info', 'Demo State Reset', 'Restored devices to documented initial state.');
      
      const resetEvent: ExecutionEvent = {
        id: `evt_reset_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'state_verification',
        message: 'Authoritative demo state reset performed.',
        success: true,
        result: res.home_state,
      };
      setEvents((prev) => [...prev, resetEvent]);
    } catch (err: any) {
      console.error('Reset error:', err);
      showToast('error', 'Reset Failed', 'Could not restore default demo state.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Application Header */}
      <AppHeader
        health={health}
        isLoading={isLoading}
        onReset={handleResetState}
        resetLoading={resetLoading}
      />

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden border-b border-slate-800 bg-slate-900/60 p-1 flex">
        <button
          onClick={() => setMobileTab('home')}
          className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'home'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Home Controls</span>
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'chat'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Assistant</span>
        </button>
        <button
          onClick={() => setMobileTab('inspector')}
          className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === 'inspector'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Inspector ({events.length})</span>
        </button>
      </div>

      {/* Main Workspace: 3-column desktop layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-4rem)]">
        {/* Left Column: Conversational Agent (4 cols) */}
        <div
          className={`lg:col-span-4 h-full overflow-hidden ${
            mobileTab === 'chat' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AssistantPanel
            messages={messages}
            isLoading={isLoading}
            health={health}
            onSendMessage={handleSendMessage}
            onClearHistory={() => setMessages([])}
            onOpenConfirm={(token, desc) =>
              setActivePendingAction({
                token,
                description: desc,
                expires_in_seconds: 60,
                action: 'unlock_door',
              })
            }
            onViewEvents={() => setMobileTab('inspector')}
          />
        </div>

        {/* Center Column: Smart Home Controls (5 cols) */}
        <div
          className={`lg:col-span-5 h-full overflow-hidden bg-slate-950/40 ${
            mobileTab === 'home' ? 'block' : 'hidden lg:block'
          }`}
        >
          <HomeDashboard
            state={homeState}
            isLoading={isLoading}
            onToggleLight={handleToggleLight}
            onChangeBrightness={handleChangeBrightness}
            onChangeTemp={handleChangeTemp}
            onChangeClimateMode={handleChangeClimateMode}
            onLockDoor={handleLockDoor}
            onTriggerUnlock={handleTriggerUnlock}
            onRunRoutine={handleRunRoutine}
          />
        </div>

        {/* Right Column: Execution Inspector (3 cols) */}
        <div
          className={`lg:col-span-3 h-full overflow-hidden ${
            mobileTab === 'inspector' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ExecutionInspector
            events={events}
            onClearEvents={() => setEvents([])}
          />
        </div>
      </main>

      {/* Security Action Confirmation Dialog */}
      <ConfirmActionDialog
        isOpen={Boolean(activePendingAction)}
        token={activePendingAction?.token || ''}
        description={activePendingAction?.description || ''}
        expiresInSeconds={activePendingAction?.expires_in_seconds || 60}
        onConfirm={handleConfirmAction}
        onCancel={() => setActivePendingAction(null)}
        isLoading={confirmLoading}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
