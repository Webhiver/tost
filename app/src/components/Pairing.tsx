import { useState, useEffect } from 'react'
import type { Network } from '../types'
import { scanNetworks, connectWifi } from '../api'

export function Pairing() {
  const [networks, setNetworks] = useState<Network[]>([])
  const [isScanning, setIsScanning] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    handleScan()
  }, [])

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const data = await scanNetworks()
      setNetworks(data.networks || [])
    } catch (err) {
      setNetworks([])
    } finally {
      setIsScanning(false)
    }
  }

  const handleConnect = async () => {
    if (!selectedNetwork) return
    
    setError(null)
    try {
      await connectWifi(selectedNetwork, password)
      setSuccess(true)
    } catch (err) {
      setError('Failed to save credentials')
    }
  }

  const handleBack = () => {
    setSelectedNetwork(null)
    setPassword('')
    setError(null)
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
        <div className="w-20 h-20 mb-6 bg-gradient-to-br from-cool to-[#00b896] rounded-xl flex items-center justify-center text-4xl shadow-[0_20px_40px_rgba(0,212,170,0.2)]">
          ✓
        </div>
        <h2 className="text-2xl font-semibold mb-3">Credentials Saved!</h2>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Your PicoThermostat will restart and<br/>connect to your WiFi network.
        </p>
      </div>
    )
  }

  if (selectedNetwork) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
        <div className="w-20 h-20 mb-6 bg-gradient-to-br from-warning to-[#ffaa00] rounded-xl flex items-center justify-center text-4xl shadow-[0_20px_40px_rgba(255,214,10,0.2)]">
          🔐
        </div>
        <h2 className="text-2xl font-semibold mb-3">{selectedNetwork}</h2>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Enter the network password to connect
        </p>
        
        <div className="w-full max-w-[380px]">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="WiFi Password"
            autoComplete="current-password"
            className="w-full px-4 py-4 bg-secondary border border-border-visible rounded-md text-text-primary text-base transition-all focus:outline-none focus:border-cool focus:shadow-[0_0_0_3px_rgba(0,212,170,0.25)] placeholder:text-text-muted"
          />
          
          {error && (
            <div className="mt-4 p-3 bg-[rgba(255,107,107,0.1)] rounded-sm text-[#ff6b6b] text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleConnect}
            className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-cool to-[#00b896] text-primary text-base font-semibold rounded-md shadow-[0_10px_30px_rgba(0,212,170,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(0,212,170,0.4)] active:translate-y-0"
          >
            Connect
          </button>
          
          <button
            onClick={handleBack}
            className="w-full mt-4 px-6 py-4 bg-transparent text-text-secondary border border-border-visible rounded-md text-base font-semibold transition-all hover:bg-tertiary hover:text-text-primary"
          >
            Back to Networks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-20 h-20 mb-6 bg-gradient-to-br from-warning to-[#ffaa00] rounded-xl flex items-center justify-center text-4xl shadow-[0_20px_40px_rgba(255,214,10,0.2)] animate-float">
        📡
      </div>
      <h2 className="text-2xl font-semibold mb-3">WiFi Setup</h2>
      <p className="text-text-secondary mb-8 leading-relaxed">
        Connect your PicoThermostat to a WiFi network to get started
      </p>
      
      <div className="w-full max-w-[380px]">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <div className="w-10 h-10 border-[3px] border-border-visible border-t-cool rounded-full animate-spin" />
            <span className="text-text-secondary text-sm">Scanning for networks...</span>
          </div>
        ) : (
          <>
            {networks.map((network) => (
              <div
                key={network.ssid}
                onClick={() => setSelectedNetwork(network.ssid)}
                className="flex justify-between items-center px-4 py-4 bg-secondary border border-border-subtle rounded-md mb-2.5 cursor-pointer transition-all hover:bg-tertiary hover:border-border-visible hover:translate-x-1"
              >
                <span className="font-medium">{network.ssid}</span>
                <span className="font-mono text-xs text-text-muted">{network.rssi} dBm</span>
              </div>
            ))}
            
            {networks.length === 0 && (
              <p className="text-text-muted py-8">No networks found</p>
            )}
          </>
        )}
        
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="w-full mt-4 px-6 py-4 bg-transparent text-text-secondary border border-border-visible rounded-md text-base font-semibold transition-all hover:bg-tertiary hover:text-text-primary disabled:opacity-50"
        >
          Refresh Networks
        </button>
      </div>
    </div>
  )
}
