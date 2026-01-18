import { useState } from 'react'
import type { Config } from '../types'
import { updateConfig } from '../api'

interface SettingsProps {
  config: Config
  isOpen: boolean
  onClose: () => void
  onConfigUpdate: (updates: Partial<Config>) => void
}

export function Settings({ config, isOpen, onClose, onConfigUpdate }: SettingsProps) {
  const [localConfig, setLocalConfig] = useState(config)

  const handleUpdate = async (key: keyof Config, value: Config[keyof Config]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }))
    onConfigUpdate({ [key]: value })
    try {
      await updateConfig({ [key]: value })
    } catch (err) {
      console.error('Failed to update config:', err)
    }
  }

  const handleSatelliteChange = async (index: number, field: 'ip' | 'name', value: string) => {
    const satellites = [...localConfig.satellites]
    satellites[index] = { ...satellites[index], [field]: value }
    setLocalConfig(prev => ({ ...prev, satellites }))
    onConfigUpdate({ satellites })
    try {
      await updateConfig({ satellites })
    } catch (err) {
      console.error('Failed to update satellites:', err)
    }
  }

  const handleAddSatellite = async () => {
    const satellites = [...localConfig.satellites, { ip: '', name: '' }]
    setLocalConfig(prev => ({ ...prev, satellites }))
    onConfigUpdate({ satellites })
    try {
      await updateConfig({ satellites })
    } catch (err) {
      console.error('Failed to add satellite:', err)
    }
  }

  const handleRemoveSatellite = async (index: number) => {
    const satellites = localConfig.satellites.filter((_, i) => i !== index)
    setLocalConfig(prev => ({ ...prev, satellites }))
    onConfigUpdate({ satellites })
    try {
      await updateConfig({ satellites })
    } catch (err) {
      console.error('Failed to remove satellite:', err)
    }
  }

  return (
    <div 
      className={`fixed inset-0 bg-primary z-[200] overflow-y-auto transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-border-subtle sticky top-0 bg-primary">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-transparent border border-border-visible text-text-primary text-xl flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Temperature Control */}
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

        {/* Timing */}
        <section className="mb-6">
          <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
            Timing
          </h3>
          
          <SettingRow label="Update Interval">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localConfig.update_interval}
                onChange={(e) => handleUpdate('update_interval', parseInt(e.target.value))}
                step="1"
                min="1"
                max="60"
                className="w-20 px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm text-right"
              />
              <span>sec</span>
            </div>
          </SettingRow>
          
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

        {/* Satellites */}
        <section className="mb-6">
          <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-text-muted mb-3 font-medium">
            Satellites
          </h3>
          
          {localConfig.satellites.map((sat, idx) => (
            <div key={idx} className="flex items-center gap-2 py-3.5 border-b border-border-subtle last:border-b-0">
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
                className="w-[130px] px-3 py-2 bg-tertiary border border-border-subtle rounded-sm text-text-primary font-mono text-sm"
              />
              <button
                onClick={() => handleRemoveSatellite(idx)}
                className="px-3 py-2 bg-transparent text-text-secondary border border-border-visible rounded-sm transition-all hover:bg-tertiary hover:text-text-primary flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          
          <button
            onClick={handleAddSatellite}
            className="w-full mt-4 px-6 py-4 bg-transparent text-text-secondary border border-border-visible rounded-md text-base font-semibold transition-all hover:bg-tertiary hover:text-text-primary"
          >
            + Add Satellite
          </button>
        </section>

        {/* Device */}
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
      </div>
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
