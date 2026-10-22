import React from 'react';
import { ShieldCheck, RefreshCw, Radio, Sparkles, Cpu } from 'lucide-react';
import { HealthResponse } from '../types';

interface AppHeaderProps {
  health: HealthResponse | null;
  isLoading: boolean;
  onReset: () => void;
  resetLoading: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  health,
  isLoading,
  onReset,
  resetLoading,
}) => {
  const isGemini = health?.mode === 'gemini';

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-slate-100 tracking-tight">
                AURA
              </span>
              <span className="text-xs text-slate-500 font-mono">v1.2</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Context-Aware Agent</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-500">Simulated Environment</span>
            </div>
          </div>
        </div>

        {/* Status & controls */}
        <div className="flex items-center gap-3">
          {/* Mode metadata indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border border-slate-800 bg-slate-900/60 px-3 py-1.5 rounded-md">
            {isGemini ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200 font-medium">Gemini AI</span>
                <span className="text-slate-500 font-mono">({health?.model || 'gemini-3.8-flash'})</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-200 font-medium">Local Mode</span>
                <span className="text-slate-500">(Deterministic)</span>
              </>
            )}
          </div>

          {/* Reset Demo State control */}
          <button
            onClick={onReset}
            disabled={resetLoading}
            title="Reset all smart-home devices to default demo state"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${resetLoading ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
