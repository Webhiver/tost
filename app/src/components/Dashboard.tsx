import type { Status } from '../types'
import type { SatelliteTarget } from './Settings'
import { formatTemp, formatHumidity, formatDuration } from '../utils'
import { Header } from './Header'
import { updateConfig } from '../api'

interface DashboardProps {
  status: Status
  onOpenSettings: () => void
  onOpenSatelliteSettings: (satellite: SatelliteTarget) => void
  onConfigUpdate: (updates: Partial<Status['config']>) => void
}

export function Dashboard({ status, onOpenSettings, onOpenSatelliteSettings, onConfigUpdate }: DashboardProps) {
  const isHeating = status.flame
  const temp = status.sensor?.temperature
  const humidity = status.sensor?.humidity
  const sensorHealthy = status.sensor?.healthy ?? true
  const sensorError = status.sensor?.message ?? ''
  const target = status.config?.target_temp ?? 22
  const satellites = status.satellites || []
  const onlineCount = satellites.filter(s => s.online).length

  const handleAdjustTarget = async (delta: number) => {
    const newTarget = Math.round((target + delta) * 10) / 10
    onConfigUpdate({ target_temp: newTarget })
    try {
      await updateConfig({ target_temp: newTarget })
    } catch (err) {
      console.error('Failed to update target temp:', err)
    }
  }

  return (
    <div className="w-full max-w-[480px] mx-auto px-5">
      <Header 
        statusType={isHeating ? 'heating' : 'idle'} 
        statusText={isHeating ? 'Heating' : 'Idle'} 
      />
      
      {/* Temperature Display */}
      <div className={`py-12 pb-10 text-center relative ${isHeating ? 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_30%,rgba(255,107,53,0.25),transparent_60%)] before:opacity-50 before:pointer-events-none' : ''}`}>
        <div className={`font-mono text-[6rem] font-light tracking-tighter leading-none inline-block ${isHeating ? 'text-flame [text-shadow:0_0_60px_rgba(255,107,53,0.25)]' : ''}`}>
          {formatTemp(temp)}
          <span className="text-[2rem] font-normal opacity-50 align-super ml-1">°C</span>
        </div>
        <div className="mt-3 text-sm text-text-secondary flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
          </svg>
          <span>{formatHumidity(humidity)}% humidity</span>
        </div>
        {!sensorHealthy && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-amber-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
            </svg>
            <span>{sensorError || 'Sensor issue'}</span>
          </div>
        )}
      </div>

      {/* Target Control */}
      <div className="bg-secondary border border-border-subtle rounded-lg p-6 mb-6 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border-visible before:to-transparent">
        <div className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-4 font-medium">
          Target Temperature
        </div>
        <div className="flex items-center justify-between">
          <div className="font-mono text-[2.5rem] font-normal tracking-tight">
            {target.toFixed(1)}°C
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => handleAdjustTarget(-0.5)}
              className="w-[52px] h-[52px] rounded-full border border-border-visible bg-tertiary text-text-primary text-2xl font-light flex items-center justify-center transition-all hover:bg-elevated hover:border-text-secondary hover:scale-105 active:scale-95"
            >
              −
            </button>
            <button 
              onClick={() => handleAdjustTarget(0.5)}
              className="w-[52px] h-[52px] rounded-full border border-border-visible bg-tertiary text-text-primary text-2xl font-light flex items-center justify-center transition-all hover:bg-elevated hover:border-text-secondary hover:scale-105 active:scale-95"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Satellites */}
      {satellites.length > 0 && (
        <div className="bg-secondary border border-border-subtle rounded-lg p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Satellites</span>
            <span className="text-[0.7rem] px-2.5 py-1 rounded-full bg-tertiary text-text-muted">
              {onlineCount}/{satellites.length} online
            </span>
          </div>
          {satellites.map((sat, idx) => {
            const satHealthy = sat.sensor?.healthy
            const satError = sat.sensor?.message
            return (
              <div 
                key={sat.ip} 
                className={`flex justify-between items-center py-3.5 ${idx > 0 ? 'border-t border-border-subtle' : ''}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-text-primary">{sat.name || sat.ip}</span>
                  <span className={`text-[0.7rem] ${sat.online ? (satHealthy ? 'text-cool' : 'text-amber-400') : 'text-text-muted'}`}>
                    {sat.online 
                      ? (satHealthy ? '● Online' : '⚠ ' + (satError || 'Sensor issue'))
                      : '○ Offline'}
                    {sat.name && <span className="text-text-muted ml-1.5">· {sat.ip}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-right ${!sat.online ? 'text-text-muted text-sm' : ''}`}>
                    {sat.online ? (
                      <>
                        <span className="font-mono text-lg font-medium">{formatTemp(sat.sensor?.temperature)}°C</span>
                        <span className="text-xs text-text-secondary ml-2">{formatHumidity(sat.sensor?.humidity)}%</span>
                      </>
                    ) : (
                      <span className="text-sm">No data</span>
                    )}
                  </div>
                  {sat.online && (
                    <button
                      onClick={() => onOpenSatelliteSettings({ ip: sat.ip, name: sat.name })}
                      className="w-8 h-8 rounded-full bg-tertiary border border-border-subtle text-text-secondary text-sm flex items-center justify-center transition-all hover:bg-elevated hover:text-text-primary"
                      title="Satellite settings"
                    >
                      ⚙
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border-subtle mt-auto">
        <p className="text-xs text-text-muted">Flame duration: {formatDuration(status.flame_duration)}</p>
      </footer>

      {/* Settings Toggle */}
      <button 
        onClick={onOpenSettings}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-elevated border border-border-visible text-text-primary text-2xl flex items-center justify-center shadow-lg transition-all hover:scale-110 hover:bg-tertiary z-[100]"
      >
        ⚙
      </button>
    </div>
  )
}
