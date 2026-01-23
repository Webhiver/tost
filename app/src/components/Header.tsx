import { WifiIcon } from './WifiIcon'

interface HeaderProps {
  statusType: 'heating' | 'idle' | 'satellite' | 'pairing' | 'off'
  statusText: string
  wifiStrength?: number | null
}

const statusStyles = {
  heating: 'bg-gradient-to-r from-flame/20 to-flame/10 text-flame border-flame/30',
  idle: 'bg-gradient-to-r from-cool/15 to-cool/8 text-cool border-cool/25',
  satellite: 'bg-gradient-to-r from-idle/15 to-idle/8 text-idle border-idle/25',
  pairing: 'bg-gradient-to-r from-warning/15 to-warning/8 text-warning border-warning/25 animate-pulse-glow',
  off: 'bg-gradient-to-r from-text-muted/15 to-text-muted/8 text-text-muted border-text-muted/25',
}

export function Header({ statusType, statusText, wifiStrength }: HeaderProps) {
  return (
    <header className="py-6 pb-4 border-b border-border-subtle relative">
      <div className="absolute top-4 right-4 text-text-muted">
        <WifiIcon strength={wifiStrength} />
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <svg 
          className="w-7 h-7 opacity-90" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"/>
        </svg>
        <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
          PicoThermostat
        </h1>
      </div>
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 mt-3.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusStyles[statusType]}`}>
          <span className={`w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor] ${statusType === 'heating' ? 'animate-flame-pulse' : ''}`} />
          {statusText}
        </div>
      </div>
    </header>
  )
}
