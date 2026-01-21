import { useState, useRef, useEffect } from 'react'
import type { Status, Config } from '../types'
import type { SatelliteTarget } from './Settings'
import { formatTemp, formatHumidity, formatDuration } from '../utils'
import { Header } from './Header'
import { WifiIcon } from './WifiIcon'
import { updateConfig } from '../api'

interface DashboardProps {
  status: Status
  onOpenSettings: () => void
  onOpenSatelliteSettings: (satellite: SatelliteTarget) => void
  onConfigUpdate: (updates: Partial<Config>) => void
  onCancelPendingFetch: () => void
  onRefreshAndResetInterval: () => Promise<void>
}

const MIN_TEMP = 5
const MAX_TEMP = 32
const TEMP_STEP = 0.5
const DEBOUNCE_MS = 500

export function Dashboard({ status, onOpenSettings, onOpenSatelliteSettings, onConfigUpdate, onCancelPendingFetch, onRefreshAndResetInterval }: DashboardProps) {
  const isHeating = status.state.flame
  const temp = status.state.sensor?.temperature
  const humidity = status.state.sensor?.humidity
  const sensorHealthy = status.state.sensor?.healthy ?? true
  const sensorError = status.state.sensor?.message ?? ''
  const serverTarget = status.config.target_temp ?? 22
  const satellites = status.state.satellites || []
  const onlineCount = satellites.filter(s => s.online).length

  // Local state for immediate slider feedback
  const [localTarget, setLocalTarget] = useState(serverTarget)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when server value changes (and we're not actively sliding)
  useEffect(() => {
    if (!debounceRef.current) {
      setLocalTarget(serverTarget)
    }
  }, [serverTarget])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTarget = parseFloat(e.target.value)
    setLocalTarget(newTarget)
    onConfigUpdate({ target_temp: newTarget })

    // Cancel any in-flight status fetch to prevent race conditions
    onCancelPendingFetch()

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null
      try {
        await updateConfig({ target_temp: newTarget })
        // After successful update, refresh status and reset polling interval
        await onRefreshAndResetInterval()
      } catch (err) {
        console.error('Failed to update target temp:', err)
      }
    }, DEBOUNCE_MS)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full max-w-[480px] mx-auto px-5">
      <Header 
        statusType={isHeating ? 'heating' : 'idle'} 
        statusText={isHeating ? 'Heating' : 'Idle'}
        wifiStrength={status.state.wifi_strength}
      />
      
      {/* Target Control */}
      <div className={`bg-secondary border border-border-subtle rounded-lg p-6 mb-4 mt-6 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border-visible before:to-transparent ${isHeating ? 'after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_30%,rgba(255,107,53,0.15),transparent_70%)] after:pointer-events-none' : ''}`}>
        <div className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-4 font-medium">
          Target Temperature
        </div>
        <div className="font-mono text-[2.5rem] font-normal tracking-tight text-center mb-5">
          {localTarget.toFixed(1)}°C
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono w-8">{MIN_TEMP}°</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={MIN_TEMP}
              max={MAX_TEMP}
              step={TEMP_STEP}
              value={localTarget}
              onChange={handleSliderChange}
              className="w-full h-2 bg-tertiary rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-flame
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-white/20
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-flame/30
                [&::-webkit-slider-thumb]:cursor-grab
                [&::-webkit-slider-thumb]:active:cursor-grabbing
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-moz-range-thumb]:w-6
                [&::-moz-range-thumb]:h-6
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-flame
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-white/20
                [&::-moz-range-thumb]:shadow-lg
                [&::-moz-range-thumb]:shadow-flame/30
                [&::-moz-range-thumb]:cursor-grab
                [&::-moz-range-thumb]:active:cursor-grabbing"
              style={{
                background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${((localTarget - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 100}%, var(--color-tertiary) ${((localTarget - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 100}%, var(--color-tertiary) 100%)`
              }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono w-8 text-right">{MAX_TEMP}°</span>
        </div>
      </div>

      {/* Device (Local Sensor) */}
      <div className="bg-secondary border border-border-subtle rounded-lg p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Device</span>
        </div>
        <div className="flex justify-between items-center py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-text-primary">Local Sensor</span>
            <span className={`text-[0.7rem] ${sensorHealthy ? 'text-cool' : 'text-amber-400'}`}>
              {sensorHealthy ? '● Healthy' : '⚠ ' + (sensorError || 'Sensor issue')}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-medium">{formatTemp(temp)}°C</span>
            <span className="text-xs text-text-secondary ml-2">{formatHumidity(humidity)}%</span>
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
            const satSensor = sat.state?.sensor
            const satHealthy = satSensor?.healthy
            const satError = satSensor?.message
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
                  {sat.online && (
                    <>
                      <WifiIcon strength={sat.state?.wifi_strength} className="w-4 h-4 text-text-muted" />
                      <button
                        onClick={() => onOpenSatelliteSettings({ ip: sat.ip, name: sat.name })}
                        className="w-8 h-8 rounded-full bg-tertiary border border-border-subtle text-text-secondary text-sm flex items-center justify-center transition-all hover:bg-elevated hover:text-text-primary"
                        title="Satellite settings"
                      >
                        ⚙
                      </button>
                    </>
                  )}
                  <div className={`text-right ${!sat.online ? 'text-text-muted text-sm' : ''}`}>
                    {sat.online ? (
                      <>
                        <span className="font-mono text-lg font-medium">{formatTemp(satSensor?.temperature)}°C</span>
                        <span className="text-xs text-text-secondary ml-2">{formatHumidity(satSensor?.humidity)}%</span>
                      </>
                    ) : (
                      <span className="text-sm">No data</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border-subtle mt-auto">
        <p className="text-xs text-text-muted">Flame duration: {formatDuration(status.state.flame_duration)}</p>
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
