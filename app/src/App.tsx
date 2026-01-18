import { useState } from 'react'
import { useStatus } from './hooks/useStatus'
import { Loading } from './components/Loading'
import { Dashboard } from './components/Dashboard'
import { SatelliteView } from './components/SatelliteView'
import { Pairing } from './components/Pairing'
import { Settings, SatelliteTarget } from './components/Settings'
import { DebugPanel } from './components/DebugPanel'

function App() {
  const {
    status,
    isLoading,
    error,
    settingsOpen,
    setSettingsOpen,
    updateLocalConfig,
  } = useStatus()

  const [satelliteSettings, setSatelliteSettings] = useState<SatelliteTarget | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)

  if (isLoading) {
    return <Loading />
  }

  if (error && !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="text-4xl">⚠️</div>
        <span className="text-text-secondary text-sm">{error}</span>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-tertiary border border-border-visible rounded-md text-sm font-medium transition-all hover:bg-elevated"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!status) {
    return <Loading />
  }

  // Pairing mode
  if (status.is_pairing) {
    return (
      <>
        <Pairing />
        <DebugPanel isOpen={debugOpen} onToggle={() => setDebugOpen(!debugOpen)} />
      </>
    )
  }

  // Satellite mode
  if (status.config?.mode === 'satellite') {
    return (
      <>
        <SatelliteView 
          status={status} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
        <Settings
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onConfigUpdate={updateLocalConfig}
        />
        <DebugPanel isOpen={debugOpen} onToggle={() => setDebugOpen(!debugOpen)} />
      </>
    )
  }

  // Host mode (default)
  return (
    <>
      <Dashboard 
        status={status} 
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSatelliteSettings={setSatelliteSettings}
        onConfigUpdate={updateLocalConfig}
      />
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigUpdate={updateLocalConfig}
      />
      <Settings
        isOpen={satelliteSettings !== null}
        onClose={() => setSatelliteSettings(null)}
        satellite={satelliteSettings ?? undefined}
      />
      <DebugPanel isOpen={debugOpen} onToggle={() => setDebugOpen(!debugOpen)} />
    </>
  )
}

export default App
