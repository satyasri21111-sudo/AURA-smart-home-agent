import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Key, Loader2, X } from 'lucide-react';

interface ConfirmActionDialogProps {
  isOpen: boolean;
  token: string;
  description: string;
  expiresInSeconds?: number;
  onConfirm: (token: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  isOpen,
  token,
  description,
  expiresInSeconds = 60,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(expiresInSeconds);
      return;
    }

    setTimeLeft(expiresInSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresInSeconds]);

  if (!isOpen) return null;

  const isExpired = timeLeft === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl p-6 space-y-5">
        {/* Close icon */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Security Authorization Challenge
            </h3>
            <p className="text-xs text-amber-300/80">Physical perimeter action protection</p>
          </div>
        </div>

        {/* Details & Warning */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-amber-200">Sensitive Action Requested:</span>
              <p className="text-slate-300">
                You are requesting to: <strong className="text-white">{description}</strong>.
                This changes the physical security perimeter of your home.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Single-Use Challenge Token:</span>
              </span>
              <span className={isExpired ? 'text-rose-400 font-bold' : 'text-cyan-400'}>
                {isExpired ? 'Expired' : `${timeLeft}s remaining`}
              </span>
            </div>
            <div className="text-slate-200 truncate select-all bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {token}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 active:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel Action
          </button>

          <button
            onClick={() => onConfirm(token)}
            disabled={isLoading || isExpired}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 transition-colors flex items-center gap-1.5 disabled:opacity-40 font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Confirm & Unlock</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
