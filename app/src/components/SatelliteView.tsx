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

  return (
    <div className="w-full max-w-[480px] mx-auto px-5">
      <Header statusType="satellite" statusText="Satellite Mode" wifiStrength={status.wifi_strength} />
      
      {/* Temperature Display */}
      <div className="py-12 pb-10 text-center">
        <div className="font-mono text-[6rem] font-light tracking-tighter leading-none inline-block">
          {formatTemp(temp)}
          <span className="text-[2rem] font-normal opacity-50 align-super ml-1">°C</span>
        </div>
        <div className="mt-3 text-sm text-text-secondary flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
          </svg>
          <span>{formatHumidity(humidity)}% humidity</span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-secondary border border-border-subtle rounded-lg p-5 mb-4">
        <p className="text-center text-text-secondary leading-relaxed">
          This device is operating as a satellite sensor.<br/>
          Temperature data is being sent to the host thermostat.
        </p>
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
