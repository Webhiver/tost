import { useState, useEffect, useCallback, useRef } from 'react'
import type { Config, FlameMode } from '../types'
import { fetchConfig, updateConfig, fetchSatelliteConfig, updateSatelliteConfig } from '../api'
import { useTheme, type Theme } from '../hooks/useTheme'

const DEBOUNCE_MS = 750
const RESULT_DISPLAY_MS = 5000

function isValidIp(ip: string): boolean {
  if (!ip) return false
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  for (const part of parts) {
    const num = parseInt(part, 10)
    if (isNaN(num) || num < 0 || num > 255) return false
    // Reject leading zeros (e.g., "01" or "001")
    if (part !== String(num)) return false
  }
  return true
}

export interface SatelliteTarget {
  ip: string
  name: string
}

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onConfigUpdate?: (updates: Partial<Config>) => void
  satellite?: SatelliteTarget
}

export function Settings({ isOpen, onClose, onConfigUpdate, satellite }: SettingsProps) {
  const [localConfig, setLocalConfig] = useState<Config | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)
  const { theme, setTheme } = useTheme()
  
  // Debounce state: accumulate pending updates and flush after delay
  const pendingUpdatesRef = useRef<Partial<Config>>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const config = satellite 
        ? await fetchSatelliteConfig(satellite.ip)
        : await fetchConfig()
      setLocalConfig(config)
    } catch (err) {
      console.error('Failed to load config:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [satellite])

  // Show save result for a limited time
  const showResult = useCallback((result: 'success' | 'error') => {
    // Clear any existing result timer
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current)
    }
    setSaveResult(result)
    resultTimerRef.current = setTimeout(() => {
      resultTimerRef.current = null
      setSaveResult(null)
    }, RESULT_DISPLAY_MS)
  }, [])

  // Flush pending updates to the API
  const flushUpdates = useCallback(async () => {
    const updates = pendingUpdatesRef.current
    if (Object.keys(updates).length === 0) return
    
    pendingUpdatesRef.current = {}
    setIsSaving(true)
    
    try {
      if (satellite) {
        await updateSatelliteConfig(satellite.ip, updates)
      } else {
        await updateConfig(updates)
      }
      showResult('success')
    } catch (err) {
      console.error('Failed to update config:', err)
      showResult('error')
    } finally {
      setIsSaving(false)
    }
  }, [satellite, showResult])

  // Schedule a debounced flush
  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      flushUpdates()
    }, DEBOUNCE_MS)
  }, [flushUpdates])

  // Queue an update: update local state immediately, debounce API call
  const queueUpdate = useCallback((updates: Partial<Config>) => {
    if (!localConfig) return
    
    // Skip if any numeric value is NaN
    for (const value of Object.values(updates)) {
      if (typeof value === 'number' && Number.isNaN(value)) return
    }
    
    // Update local state immediately
    setLocalConfig(prev => prev ? { ...prev, ...updates } : null)
    
    // Notify parent for optimistic UI updates
    if (!satellite) {
      onConfigUpdate?.(updates)
    }
    
    // Accumulate pending updates and schedule flush
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }
    scheduleFlush()
  }, [localConfig, satellite, onConfigUpdate, scheduleFlush])

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    } else {
      // Flush any pending updates before closing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        flushUpdates()
      }
      // Reset state
      setLocalConfig(null)
      setError(null)
      setIsSaving(false)
      setSaveResult(null)
      pendingUpdatesRef.current = {}
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current)
        resultTimerRef.current = null
      }
    }
  }, [isOpen, loadConfig, flushUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current)
      }
    }
  }, [])

  const handleUpdate = (key: keyof Config, value: Config[keyof Config]) => {
    queueUpdate({ [key]: value } as Partial<Config>)
  }

  const handleSatelliteChange = (index: number, field: 'ip' | 'name', value: string) => {
    if (!localConfig) return
    const satellites = [...localConfig.satellites]
    satellites[index] = { ...satellites[index], [field]: value }
    
    // Update local state immediately for responsive UI
    setLocalConfig(prev => prev ? { ...prev, satellites } : null)
    
    // Only queue update to server with valid satellites
    const validSatellites = satellites.filter(sat => isValidIp(sat.ip))
    
    // Clear any existing debounce timer and schedule new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, satellites: validSatellites }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      flushUpdates()
    }, DEBOUNCE_MS)
  }

  const handleAddSatellite = () => {
    if (!localConfig) return
    // Only update local state - empty IP won't be sent to server
    const satellites = [...localConfig.satellites, { ip: '', name: '' }]
    setLocalConfig(prev => prev ? { ...prev, satellites } : null)
  }

  const handleRemoveSatellite = (index: number) => {
    if (!localConfig) return
    const satellites = localConfig.satellites.filter((_, i) => i !== index)
    
    // Update local state immediately
    setLocalConfig(prev => prev ? { ...prev, satellites } : null)
    
    // Send only valid satellites to the server
    const validSatellites = satellites.filter(sat => isValidIp(sat.ip))
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, satellites: validSatellites }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      flushUpdates()
    }, DEBOUNCE_MS)
  }

  const getTitle = () => {
    if (satellite) {
      return satellite.name ? `${satellite.name} (${satellite.ip})` : satellite.ip
    }
    return 'Settings'
  }

  return (
    <div 
      className={`fixed inset-0 bg-primary z-[200] overflow-y-auto transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-border-subtle sticky top-0 bg-primary">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{satellite ? 'Satellite Settings' : 'Settings'}</h2>
            {isSaving && (
              <div className="flex items-center gap-1.5 text-text-muted">
                <div className="w-3 h-3 border border-text-muted border-t-text-secondary rounded-full animate-spin" />
                <span className="text-xs">Saving</span>
              </div>
            )}
            {!isSaving && saveResult === 'success' && (
              <div className="flex items-center gap-1 text-cool">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs">Saved</span>
              </div>
            )}
            {!isSaving && saveResult === 'error' && (
              <div className="flex items-center gap-1 text-flame">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="text-xs">Saving failed</span>
              </div>
            )}
          </div>
          {satellite && (
            <span className="text-xs text-text-muted mt-0.5">{getTitle()}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-transparent border border-border-visible text-text-primary text-xl flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-2 border-text-muted border-t-text-primary rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Loading settings...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-3xl">⚠️</div>
          <span className="text-sm text-text-secondary">{error}</span>
          <button 
            onClick={loadConfig}
            className="mt-2 px-4 py-2 bg-tertiary border border-border-visible rounded-md text-sm font-medium transition-all hover:bg-elevated"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {localConfig && !isLoading && !error && (
      <div className="p-5">
        {/* Appearance - Web app theme (not shown for satellite settings) */}
        {!satellite && (
          <section className="mb-6">
            <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
              Appearance
            </h3>
            
            <SettingRow label="Theme">
              <ThemeSelector value={theme} onChange={setTheme} />
            </SettingRow>
          </section>
        )}

        {/* Temperature Control - Host only */}
        {localConfig.mode !== 'satellite' && !satellite && (
          <section className="mb-6">
            <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
              Temperature Control
            </h3>
            
            <SettingRow label="Hysteresis">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localConfig.hysteresis}
                  onChange={(e) => handleUpdate('hysteresis', parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  max="5"
                  className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
                />
                <span>°C</span>
              </div>
            </SettingRow>
            
            <SettingRow label="Flame On Mode">
              <select
                value={localConfig.flame_on_mode}
                onChange={(e) => handleUpdate('flame_on_mode', e.target.value as 'average' | 'all')}
                className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
              >
                <option value="average">Average</option>
                <option value="all">All Sensors</option>
              </select>
            </SettingRow>
            
            <SettingRow label="Flame Off Mode">
              <select
                value={localConfig.flame_off_mode}
                onChange={(e) => handleUpdate('flame_off_mode', e.target.value as 'average' | 'all')}
                className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
              >
                <option value="average">Average</option>
                <option value="all">All Sensors</option>
              </select>
            </SettingRow>
            
            <SettingRow label="Flame Mode">
              <select
                value={localConfig.flame_mode}
                onChange={(e) => handleUpdate('flame_mode', e.target.value as FlameMode)}
                className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
              >
                <option value="average">Average</option>
                <option value="all">All Sensors</option>
                <option value="any">Any Sensor</option>
                <option value="one">One Sensor</option>
              </select>
            </SettingRow>
            
            {localConfig.flame_mode === 'one' && (
              <SettingRow label="Flame Mode Sensor">
                <select
                  value={localConfig.flame_mode_sensor}
                  onChange={(e) => handleUpdate('flame_mode_sensor', e.target.value)}
                  className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
                >
                  <option value="local">Local</option>
                  {localConfig.satellites.map((sat) => (
                    <option key={sat.ip} value={sat.ip}>
                      {sat.name || sat.ip}
                    </option>
                  ))}
                </select>
              </SettingRow>
            )}
            
            <SettingRow label="Local Sensor">
              <select
                value={localConfig.local_sensor}
                onChange={(e) => handleUpdate('local_sensor', e.target.value as 'included' | 'fallback')}
                className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
              >
                <option value="included">Always Include</option>
                <option value="fallback">Fallback Only</option>
              </select>
            </SettingRow>
          </section>
        )}

        {/* Sensor Calibration */}
        <section className="mb-6">
          <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
            Sensor Calibration
          </h3>
          
          <SettingRow label="Temperature Offset">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localConfig.sensor_temperature_offset}
                onChange={(e) => handleUpdate('sensor_temperature_offset', parseFloat(e.target.value))}
                step="0.1"
                min="-10"
                max="10"
                className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
              />
              <span>°C</span>
            </div>
          </SettingRow>
          
          <SettingRow label="Humidity Offset">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localConfig.sensor_humidity_offset}
                onChange={(e) => handleUpdate('sensor_humidity_offset', parseFloat(e.target.value))}
                step="1"
                min="-20"
                max="20"
                className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
              />
              <span>%</span>
            </div>
          </SettingRow>
        </section>

        {/* Timing - Host only */}
        {localConfig.mode !== 'satellite' && !satellite && (
          <section className="mb-6">
            <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
              Timing
            </h3>
            
            <SettingRow label="Satellite Grace Period">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localConfig.satellite_grace_period}
                  onChange={(e) => handleUpdate('satellite_grace_period', parseInt(e.target.value))}
                  step="10"
                  min="30"
                  max="600"
                  className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
                />
                <span>sec</span>
              </div>
            </SettingRow>
            
            <SettingRow label="Max Flame Duration">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={Math.round(localConfig.max_flame_duration / 3600)}
                  onChange={(e) => handleUpdate('max_flame_duration', parseInt(e.target.value) * 3600)}
                  step="1"
                  min="1"
                  max="24"
                  className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
                />
                <span>hours</span>
              </div>
            </SettingRow>
          </section>
        )}

        {/* Display */}
        <section className="mb-6">
          <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
            Display
          </h3>
          
          <SettingRow label="LED Brightness">
            <input
              type="range"
              value={localConfig.led_brightness * 100}
              onChange={(e) => handleUpdate('led_brightness', parseInt(e.target.value) / 100)}
              min="0"
              max="100"
              className="w-[100px]"
            />
          </SettingRow>
        </section>

        {/* Satellites - Host only */}
        {localConfig.mode !== 'satellite' && !satellite && (
          <section className="mb-6">
            <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
              Satellites
            </h3>
            
            {localConfig.satellites.map((sat, idx) => {
              const ipValid = isValidIp(sat.ip)
              const showError = sat.ip.length > 0 && !ipValid
              return (
                <div key={idx} className="flex flex-col gap-1 py-3.5 border-b border-border-subtle last:border-b-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sat.name}
                      onChange={(e) => handleSatelliteChange(idx, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1 min-w-0 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
                    />
                    <input
                      type="text"
                      value={sat.ip}
                      onChange={(e) => handleSatelliteChange(idx, 'ip', e.target.value)}
                      placeholder="192.168.1.x"
                      className={`w-[130px] px-3 py-2 bg-tertiary border rounded-sm text-text-primary font-mono text-sm ${
                        showError ? 'border-flame' : 'border-border-subtle'
                      }`}
                    />
                    <button
                      onClick={() => handleRemoveSatellite(idx)}
                      className="px-3 py-2 bg-transparent text-text-secondary border border-border-visible rounded-sm transition-all hover:bg-tertiary hover:text-text-primary flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                  {showError && (
                    <span className="text-xs text-flame ml-auto mr-12">Invalid IP address</span>
                  )}
                </div>
              )
            })}
            
            <button
              onClick={handleAddSatellite}
              className="w-full mt-4 px-6 py-4 bg-transparent text-text-secondary border border-border-visible rounded-md text-base font-semibold transition-all hover:bg-tertiary hover:text-text-primary"
            >
              + Add Satellite
            </button>
          </section>
        )}

        {/* Device - Not shown when editing satellite remotely */}
        {!satellite && (
          <section className="mb-6">
            <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
              Device
            </h3>
            
            <SettingRow label="Mode">
              <select
                value={localConfig.mode}
                onChange={(e) => handleUpdate('mode', e.target.value as 'host' | 'satellite')}
                className="px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary text-sm"
              >
                <option value="host">Host</option>
                <option value="satellite">Satellite</option>
              </select>
            </SettingRow>
          </section>
        )}
      </div>
      )}
    </div>
  )
}

interface SettingRowProps {
  label: string
  children: React.ReactNode
}

function SettingRow({ label, children }: SettingRowProps) {
  return (
    <div className="flex justify-between items-center py-3.5 border-b border-border-subtle last:border-b-0">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

interface ThemeSelectorProps {
  value: Theme
  onChange: (theme: Theme) => void
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'light', 
      label: 'Light',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      )
    },
    { 
      value: 'dark', 
      label: 'Dark',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )
    },
    { 
      value: 'system', 
      label: 'Auto',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )
    },
  ]

  return (
    <div className="flex gap-1 p-1 bg-tertiary rounded-md">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all
            ${value === option.value 
              ? 'bg-elevated text-text-primary shadow-sm' 
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
          title={option.label}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
