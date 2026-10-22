import React from 'react';
import { Bot, User, ShieldAlert, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';
import { MessageItem } from '../types';

interface ChatMessageProps {
  message: MessageItem;
  onOpenConfirm?: (token: string, description: string) => void;
  onViewEvents?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onOpenConfirm,
  onViewEvents,
}) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="py-2 text-center text-xs text-slate-500 font-mono">
        {message.text}
      </div>
    );
  }

  const toolEvents = message.events?.filter((e) => e.type === 'tool_call') || [];

  return (
    <div className={`flex gap-3 text-sm ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-medium border ${
          isUser
            ? 'bg-slate-800 border-slate-700 text-slate-300'
            : 'bg-cyan-950/60 border-cyan-800/40 text-cyan-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-3.5 rounded-lg border leading-relaxed ${
            isUser
              ? 'bg-indigo-950/40 border-indigo-900/50 text-slate-100'
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}
        >
          {/* Header metadata */}
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 mb-1">
            <span className="font-medium text-slate-400">
              {isUser ? 'You' : 'AURA'}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              {message.mode && (
                <>
                  <span className={message.mode === 'gemini' ? 'text-cyan-500' : 'text-amber-500'}>
                    {message.mode === 'gemini' ? 'Gemini' : 'Local'}
                  </span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                </>
              )}
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Message content */}
          <p className="whitespace-pre-wrap">{message.text}</p>

          {/* Pending confirmation card inside message */}
          {message.pendingAction && onOpenConfirm && (
            <div className="mt-3 p-3 rounded-md bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Security Authorization Required</span>
              </div>
              <p className="text-amber-300/80">
                Action: {message.pendingAction.description}
              </p>
              <button
                onClick={() => onOpenConfirm(message.pendingAction!.token, message.pendingAction!.description)}
                className="mt-1 self-start px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-medium rounded text-xs transition-colors"
              >
                Authorize Action
              </button>
            </div>
          )}

          {/* Executed tools summary footer */}
          {toolEvents.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Executed {toolEvents.length} {toolEvents.length === 1 ? 'tool' : 'tools'}</span>
              </div>
              {onViewEvents && (
                <button
                  onClick={onViewEvents}
                  className="flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Inspect</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
