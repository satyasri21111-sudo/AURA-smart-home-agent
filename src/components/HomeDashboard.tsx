import React from 'react';
import { HomeState } from '../types';
import { DeviceCard } from './DeviceCard';
import { ClimateCard } from './ClimateCard';
import { SecurityCard } from './SecurityCard';
import { RoutineSelector } from './RoutineSelector';
import { ShieldCheck, Zap, Activity } from 'lucide-react';

interface HomeDashboardProps {
  state: HomeState | null;
  isLoading: boolean;
  onToggleLight: (deviceId: string, currentOn: boolean) => void;
  onChangeBrightness: (deviceId: string, brightness: number) => void;
  onChangeTemp: (temp: number) => void;
  onChangeClimateMode: (mode: 'heat' | 'cool' | 'off') => void;
  onLockDoor: () => void;
  onTriggerUnlock: () => void;
  onRunRoutine: (routineId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  state,
  isLoading,
  onToggleLight,
  onChangeBrightness,
  onChangeTemp,
  onChangeClimateMode,
  onLockDoor,
  onTriggerUnlock,
  onRunRoutine,
}) => {
  if (!state) {
    return (
      <div className="p-6 flex items-center justify-center h-full text-slate-500 text-sm">
        Loading smart home state...
      </div>
    );
  }

  const { devices, last_updated } = state;
  const lightsOnCount = (devices.living_room_light.on ? 1 : 0) + (devices.bedroom_light.on ? 1 : 0);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header & Status summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
            Simulated Residence
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>Authoritative State</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-500">
              Updated {new Date(last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Quiet status metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lightsOnCount}/2 Lights Active</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="capitalize">{devices.thermostat.mode} ({devices.thermostat.target_temp}°C)</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className={`w-3.5 h-3.5 ${devices.front_door.locked ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{devices.front_door.locked ? 'Door Locked' : 'Door Unlocked'}</span>
          </div>
        </div>
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Living Room Light */}
        <DeviceCard
          device={devices.living_room_light}
          onTogglePower={onToggleLight}
          onChangeBrightness={onChangeBrightness}
          disabled={isLoading}
        />

        {/* Bedroom Light */}
        <DeviceCard
          device={devices.bedroom_light}
          onTogglePower={onToggleLight}
          onChangeBrightness={onChangeBrightness}
          disabled={isLoading}
        />

        {/* Climate Thermostat */}
        <ClimateCard
          device={devices.thermostat}
          onChangeTemp={onChangeTemp}
          onChangeMode={onChangeClimateMode}
          disabled={isLoading}
        />

        {/* Front Door Lock */}
        <SecurityCard
          device={devices.front_door}
          onLock={onLockDoor}
          onTriggerUnlock={onTriggerUnlock}
          disabled={isLoading}
        />
      </div>

      {/* Quick Routines Section */}
      <div className="pt-2">
        <RoutineSelector onRunRoutine={onRunRoutine} disabled={isLoading} />
      </div>
    </div>
  );
};
