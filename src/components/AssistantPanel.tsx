import React, { useRef, useEffect } from 'react';
import { Trash2, Cpu, Sparkles, AlertCircle } from 'lucide-react';
import { MessageItem, HealthResponse } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface AssistantPanelProps {
  messages: MessageItem[];
  isLoading: boolean;
  health: HealthResponse | null;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onOpenConfirm: (token: string, description: string) => void;
  onViewEvents: () => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  messages,
  isLoading,
  health,
  onSendMessage,
  onClearHistory,
  onOpenConfirm,
  onViewEvents,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLocalMode = health?.mode === 'local_fallback';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border-r border-slate-800">
      {/* Panel header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Conversational Agent</span>
          </h2>
          <p className="text-xs text-slate-400">Natural language tool dispatch</p>
        </div>

        <button
          onClick={onClearHistory}
          title="Clear chat messages"
          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Local fallback banner notice if active */}
      {isLocalMode && (
        <div className="mx-4 mt-3 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex items-start gap-2.5 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-amber-300">Local Command Mode Active</span>
            <p className="text-amber-200/80 leading-normal">
              Gemini API key is not configured. AURA is operating with deterministic local parsing for standard lights, climate, routines, and security commands.
            </p>
          </div>
        </div>
      )}

      {/* Message stream */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">AURA Ready</h3>
            <p className="text-xs max-w-xs text-slate-400">
              Issue voice or text commands. Gemini will inspect home status, select tools, and verify updates.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onOpenConfirm={onOpenConfirm}
              onViewEvents={onViewEvents}
            />
          ))
        )}

        {/* Processing skeleton */}
        {isLoading && (
          <div className="flex gap-3 text-sm animate-pulse">
            <div className="w-7 h-7 rounded-md bg-cyan-950/40 border border-cyan-800/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Analyzing intent and executing tools...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input composer footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <ChatInput onSend={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};
