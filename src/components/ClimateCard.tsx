import React from 'react';
import { Thermometer, Flame, Snowflake, PowerOff, Plus, Minus } from 'lucide-react';
import { ClimateDevice } from '../types';

interface ClimateCardProps {
  device: ClimateDevice;
  onChangeTemp: (temp: number) => void;
  onChangeMode: (mode: 'heat' | 'cool' | 'off') => void;
  disabled?: boolean;
}

export const ClimateCard: React.FC<ClimateCardProps> = ({
  device,
  onChangeTemp,
  onChangeMode,
  disabled = false,
}) => {
  const { name, target_temp, current_temp, mode } = device;

  const handleTempAdjust = (delta: number) => {
    const newTemp = Math.min(30.0, Math.max(16.0, Math.round((target_temp + delta) * 10) / 10));
    onChangeTemp(newTemp);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'heat':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'cool':
        return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case 'off':
      default:
        return <PowerOff className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
            {getModeIcon()}
          </div>
          <div>
            <h3 className="font-medium text-sm text-slate-100">{name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="capitalize">{mode} Mode</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Ambient {current_temp}°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature control dial / display */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
        <button
          onClick={() => handleTempAdjust(-0.5)}
          disabled={disabled || target_temp <= 16.0}
          title="Decrease temperature (-0.5°C)"
          className="w-9 h-9 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-200 flex items-center justify-center border border-slate-700/80 transition-colors disabled:opacity-40"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
            {target_temp.toFixed(1)}°C
          </div>
          <div className="text-[11px] text-slate-400">Target Temperature (16–30°C)</div>
        </div>

        <button
          onClick={() => handleTempAdjust(0.5)}
          disabled={disabled || target_temp >= 30.0}
          title="Increase temperature (+0.5°C)"
          className="w-9 h-9 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-200 flex items-center justify-center border border-slate-700/80 transition-colors disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Mode segmented control */}
      <div className="space-y-1.5">
        <span className="text-xs text-slate-400">Operating Mode</span>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            onClick={() => onChangeMode('heat')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
              mode === 'heat'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heat</span>
          </button>

          <button
            onClick={() => onChangeMode('cool')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
              mode === 'cool'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Cool</span>
          </button>

          <button
            onClick={() => onChangeMode('off')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
              mode === 'off'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>Off</span>
          </button>
        </div>
      </div>
    </div>
  );
};
