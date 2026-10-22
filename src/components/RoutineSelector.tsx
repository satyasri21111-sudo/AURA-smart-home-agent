import React from 'react';
import { Home, Moon, Sun, Shield } from 'lucide-react';

interface RoutineSelectorProps {
  onRunRoutine: (routineId: string) => void;
  disabled?: boolean;
}

const ROUTINES = [
  {
    id: 'leaving_home',
    name: 'Leaving Home',
    icon: Home,
    description: 'Lights off, climate off, lock door',
  },
  {
    id: 'relaxing_evening',
    name: 'Relaxing Evening',
    icon: Moon,
    description: 'Dim living room (40%), warm 22°C',
  },
  {
    id: 'good_morning',
    name: 'Good Morning',
    icon: Sun,
    description: 'Bedroom 75%, living 50%, warm 21°C',
  },
  {
    id: 'secure_home',
    name: 'Secure Home',
    icon: Shield,
    description: 'All off & lock perimeter',
  },
];

export const RoutineSelector: React.FC<RoutineSelectorProps> = ({
  onRunRoutine,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Quick Routines
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">Simulated Scenes</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROUTINES.map((routine) => {
          const Icon = routine.icon;
          return (
            <button
              key={routine.id}
              onClick={() => onRunRoutine(routine.id)}
              disabled={disabled}
              className="p-3 text-left rounded-lg bg-slate-900/60 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-1.5 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-xs text-slate-200 group-hover:text-white">
                  {routine.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {routine.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
