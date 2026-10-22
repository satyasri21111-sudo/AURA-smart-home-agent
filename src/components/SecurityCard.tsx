import React from 'react';
import { Lock, Unlock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { SecurityDevice } from '../types';

interface SecurityCardProps {
  device: SecurityDevice;
  onLock: () => void;
  onTriggerUnlock: () => void;
  disabled?: boolean;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({
  device,
  onLock,
  onTriggerUnlock,
  disabled = false,
}) => {
  const { name, locked } = device;

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        locked
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
              locked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
          >
            {locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-medium text-sm text-slate-100">{name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={locked ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {locked ? 'Securely Locked' : 'Door Unlocked'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Front Entrance</span>
            </div>
          </div>
        </div>

        {/* Action button aligned identically to DeviceCard */}
        {locked ? (
          <button
            onClick={onTriggerUnlock}
            disabled={disabled}
            title="Unlock front door"
            className="p-2 rounded-lg border transition-colors bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onLock}
            disabled={disabled}
            title="Lock front door"
            className="p-2 rounded-lg border transition-colors bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-500">
        {locked ? (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Perimeter secured. Unlocking requires human confirmation challenge.</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300/80">Caution: Entrance is currently unlocked.</span>
          </>
        )}
      </div>
    </div>
  );
};