import { useStatus } from './hooks/useStatus'
import { Loading } from './components/Loading'
import { Dashboard } from './components/Dashboard'
import { SatelliteView } from './components/SatelliteView'
import { Pairing } from './components/Pairing'
import { Settings } from './components/Settings'

function App() {
  const {
    status,
    isLoading,
    error,
    settingsOpen,
    setSettingsOpen,
    updateLocalConfig,
  } = useStatus()

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
    return <Pairing />
  }

  // Satellite mode
  if (status.config?.mode === 'satellite') {
    return (
      <>
        <SatelliteView 
          status={status} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
        {status.config && (
          <Settings
            config={status.config}
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onConfigUpdate={updateLocalConfig}
          />
        )}
      </>
    )
  }

  // Host mode (default)
  return (
    <>
      <Dashboard 
        status={status} 
        onOpenSettings={() => setSettingsOpen(true)}
        onConfigUpdate={updateLocalConfig}
      />
      {status.config && (
        <Settings
          config={status.config}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onConfigUpdate={updateLocalConfig}
        />
      )}
    </>
  )
}

export default App
