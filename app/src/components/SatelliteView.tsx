import type { Status } from '../types'
import { formatTemp, formatHumidity } from '../utils'
import { Header } from './Header'

interface SatelliteViewProps {
  status: Status
  onOpenSettings: () => void
}

export function SatelliteView({ status, onOpenSettings }: SatelliteViewProps) {
  const temp = status.sensor?.temperature
  const humidity = status.sensor?.humidity
  const sensorHealthy = status.sensor?.healthy ?? true
  const sensorError = status.sensor?.message ?? ''

  return (
    <div className="w-full max-w-[480px] mx-auto px-5">
      <Header statusType="satellite" statusText="Satellite Mode" wifiStrength={status.wifi_strength} />
      
      {/* Info Card */}
      <div className="bg-secondary border border-border-subtle rounded-lg p-5 mb-4 mt-6">
        <p className="text-center text-text-secondary leading-relaxed">
          This device is operating as a satellite sensor.<br/>
          Temperature data is being sent to the host thermostat.
        </p>
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
