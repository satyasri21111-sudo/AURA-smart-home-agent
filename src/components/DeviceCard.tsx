import React from 'react';
import { Lightbulb, Power } from 'lucide-react';
import { LightDevice } from '../types';

interface DeviceCardProps {
  device: LightDevice;
  onTogglePower: (deviceId: string, currentOn: boolean) => void;
  onChangeBrightness: (deviceId: string, brightness: number) => void;
  disabled?: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onTogglePower,
  onChangeBrightness,
  disabled = false,
}) => {
  const { id, name, on, brightness } = device;

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        on
          ? 'bg-slate-900/90 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
          : 'bg-slate-900/40 border-slate-800/80 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
              on
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
            }`}
          >
            <Lightbulb className={`w-5 h-5 ${on ? 'fill-cyan-400/20' : ''}`} />
          </div>
          <div>
            <h3 className="font-medium text-sm text-slate-100">{name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={on ? 'text-cyan-400 font-medium' : 'text-slate-500'}>
                {on ? 'Turned On' : 'Turned Off'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono">{brightness}%</span>
            </div>
          </div>
        </div>

        {/* Power toggle button */}
        <button
          onClick={() => onTogglePower(id, on)}
          disabled={disabled}
          title={on ? 'Turn off' : 'Turn on'}
          className={`p-2 rounded-lg border transition-colors ${
            on
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
          } disabled:opacity-50`}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {/* Brightness slider */}
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Brightness</span>
          <span className="font-mono text-slate-300">{brightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => onChangeBrightness(id, parseInt(e.target.value, 10))}
          disabled={disabled}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};
