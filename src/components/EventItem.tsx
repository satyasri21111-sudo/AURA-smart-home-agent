import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wrench,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  User,
  Bot,
} from 'lucide-react';
import { ExecutionEvent, EventType } from '../types';

interface EventItemProps {
  event: ExecutionEvent;
}

export const EventItem: React.FC<EventItemProps> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasPayload = Boolean(event.arguments || event.result);

  const getEventBadge = (type: EventType) => {
    switch (type) {
      case 'user_request':
        return { icon: User, color: 'text-indigo-400', label: 'User Request' };
      case 'intent_interpretation':
        return { icon: Sparkles, color: 'text-cyan-400', label: 'Intent Analysis' };
      case 'tool_call':
        return { icon: Wrench, color: 'text-sky-400', label: 'Tool Call' };
      case 'tool_result':
        return { icon: ArrowRight, color: event.success ? 'text-emerald-400' : 'text-rose-400', label: 'Tool Result' };
      case 'state_verification':
        return { icon: CheckCircle2, color: 'text-emerald-400', label: 'State Verified' };
      case 'confirmation_required':
        return { icon: ShieldAlert, color: 'text-amber-400', label: 'Security Challenge' };
      case 'clarification_required':
        return { icon: AlertCircle, color: 'text-amber-400', label: 'Clarification' };
      case 'assistant_response':
        return { icon: Bot, color: 'text-cyan-400', label: 'Agent Response' };
      case 'error':
        return { icon: XCircle, color: 'text-rose-400', label: 'Error' };
      default:
        return { icon: Sparkles, color: 'text-slate-400', label: type };
    }
  };

  const badge = getEventBadge(event.type);
  const Icon = badge.icon;

  return (
    <div className="border border-slate-800/80 rounded-lg bg-slate-900/60 overflow-hidden text-xs transition-colors hover:border-slate-700">
      {/* Header row */}
      <div
        onClick={() => hasPayload && setIsExpanded(!isExpanded)}
        className={`p-3 flex items-start justify-between gap-3 ${
          hasPayload ? 'cursor-pointer hover:bg-slate-850/60 select-none' : ''
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 shrink-0 ${badge.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${badge.color}`}>{badge.label}</span>
              {event.tool && (
                <>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {event.tool}
                  </span>
                </>
              )}
            </div>
            <p className="text-slate-300 leading-snug">{event.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-slate-500">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {hasPayload && (
            <div className="text-slate-500">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>
      </div>

      {/* Expandable JSON details */}
      {isExpanded && hasPayload && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 font-mono text-[11px] space-y-2 overflow-x-auto">
          {event.arguments && (
            <div>
              <div className="text-slate-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Arguments:
              </div>
              <pre className="text-cyan-300 bg-slate-900/90 p-2 rounded border border-slate-800 overflow-x-auto">
                {JSON.stringify(event.arguments, null, 2)}
              </pre>
            </div>
          )}
          {event.result && (
            <div>
              <div className="text-slate-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Result:
              </div>
              <pre className="text-emerald-300 bg-slate-900/90 p-2 rounded border border-slate-800 overflow-x-auto">
                {JSON.stringify(event.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
