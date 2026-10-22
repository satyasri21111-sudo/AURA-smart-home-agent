import React, { useState } from 'react';
import { Terminal, Trash2, Filter } from 'lucide-react';
import { ExecutionEvent } from '../types';
import { EventItem } from './EventItem';

interface ExecutionInspectorProps {
  events: ExecutionEvent[];
  onClearEvents: () => void;
}

type FilterCategory = 'all' | 'tools' | 'verifications' | 'security';

export const ExecutionInspector: React.FC<ExecutionInspectorProps> = ({
  events,
  onClearEvents,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const filteredEvents = events.filter((e) => {
    if (filter === 'tools') return e.type === 'tool_call' || e.type === 'tool_result';
    if (filter === 'verifications') return e.type === 'state_verification';
    if (filter === 'security') return e.type === 'confirmation_required' || e.type === 'error';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-100">Execution Inspector</h2>
          <span className="font-mono text-xs text-slate-500">({events.length})</span>
        </div>

        {events.length > 0 && (
          <button
            onClick={onClearEvents}
            title="Clear displayed event history"
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter tab bar */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            filter === 'all'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({events.length})
        </button>
        <button
          onClick={() => setFilter('tools')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            filter === 'tools'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tools
        </button>
        <button
          onClick={() => setFilter('verifications')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            filter === 'verifications'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Verification
        </button>
        <button
          onClick={() => setFilter('security')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            filter === 'security'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Security
        </button>
      </div>

      {/* Events timeline list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Terminal className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">No Events Recorded</h3>
            <p className="text-xs max-w-xs text-slate-500">
              When commands are issued, real-time backend tool calls, argument validation, and state verifications will stream here.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => <EventItem key={evt.id} event={evt} />)
        )}
      </div>

      {/* Footer explanation */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>Authoritative Event Stream</span>
        <span>Audit Verifiable</span>
      </div>
    </div>
  );
};
