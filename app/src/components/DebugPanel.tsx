import { useState, useEffect, useCallback } from 'react'
import type { DebugInfo } from '../types'
import { fetchDebug } from '../api'

interface DebugPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export function DebugPanel({ isOpen, onToggle }: DebugPanelProps) {
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadDebug = useCallback(async () => {
    try {
      const data = await fetchDebug()
      setDebug(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load debug info:', err)
      setError('Failed to fetch debug info')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load when opening
  useEffect(() => {
    if (isOpen && !debug) {
      setIsLoading(true)
      loadDebug()
    }
  }, [isOpen, debug, loadDebug])

  // Poll every 3 seconds while open
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      loadDebug()
    }, 3000)

    return () => clearInterval(interval)
  }, [isOpen, loadDebug])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setDebug(null)
      setError(null)
      setLastUpdated(null)
    }
  }, [isOpen])

  return (
    <>
      {/* Debug Button */}
      <button
        onClick={onToggle}
        className={`fixed bottom-8 left-8 z-[150] w-10 h-10 rounded-full border transition-all duration-200 flex items-center justify-center text-sm font-mono ${
          isOpen 
            ? 'bg-elevated border-idle text-idle' 
            : 'bg-secondary border-border-visible text-text-muted hover:bg-tertiary hover:text-text-secondary'
        }`}
        title="Toggle Debug Panel"
      >
        {isOpen ? '×' : '{ }'}
      </button>

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-primary border-r border-border-visible z-[140] overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-primary border-b border-border-subtle p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-primary">Debug Info</h2>
            {lastUpdated && (
              <span className="text-[10px] text-text-muted font-mono">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          {isLoading && !debug && (
            <div className="mt-2 text-xs text-text-muted">Loading...</div>
          )}
        </div>

        {/* Error State */}
        {error && !debug && (
          <div className="p-4 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <span className="text-sm text-text-secondary">{error}</span>
          </div>
        )}

        {/* Content */}
        {debug && (
          <div className="p-4 space-y-4">
            {/* Memory */}
            <DebugSection title="Memory">
              <DebugRow label="Free" value={`${debug.memory.free_kb} KB`} />
              <DebugRow label="Used" value={`${debug.memory.percent_used}%`} />
              <DebugBar percent={debug.memory.percent_used} color="idle" />
            </DebugSection>

            {/* CPU */}
            <DebugSection title="CPU">
              <DebugRow label="Frequency" value={`${debug.cpu.frequency_mhz} MHz`} />
              {debug.internal_temp_c !== null && (
                <DebugRow label="Internal Temp" value={`${debug.internal_temp_c}°C`} />
              )}
            </DebugSection>

            {/* Uptime */}
            <DebugSection title="Uptime">
              <DebugRow label="Running" value={debug.uptime.formatted} mono />
            </DebugSection>

            {/* Flash Storage */}
            {debug.flash.total_kb && (
              <DebugSection title="Flash Storage">
                <DebugRow label="Total" value={`${debug.flash.total_kb} KB`} />
                <DebugRow label="Free" value={`${debug.flash.free_kb} KB`} />
                {debug.flash.percent_used !== null && (
                  <>
                    <DebugRow label="Used" value={`${debug.flash.percent_used}%`} />
                    <DebugBar percent={debug.flash.percent_used} color="flame" />
                  </>
                )}
              </DebugSection>
            )}

            {/* Network */}
            {debug.network && (
              <DebugSection title="Network">
                <DebugRow label="IP" value={debug.network.ip} mono />
                <DebugRow label="Gateway" value={debug.network.gateway} mono />
                <DebugRow label="DNS" value={debug.network.dns} mono />
                {debug.network.rssi !== null && (
                  <DebugRow label="RSSI" value={`${debug.network.rssi} dBm`} />
                )}
              </DebugSection>
            )}

            {/* System */}
            {debug.system && (
              <DebugSection title="System">
                <DebugRow label="Machine" value={debug.system.machine} small />
                <DebugRow label="Release" value={debug.system.release} small />
              </DebugSection>
            )}
          </div>
        )}
      </div>

      {/* Backdrop (click to close) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[130] transition-opacity"
          onClick={onToggle}
        />
      )}
    </>
  )
}

interface DebugSectionProps {
  title: string
  children: React.ReactNode
}

function DebugSection({ title, children }: DebugSectionProps) {
  return (
    <div className="bg-secondary rounded-sm p-3">
      <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2 font-medium">
        {title}
      </h3>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  )
}

interface DebugRowProps {
  label: string
  value: string
  mono?: boolean
  small?: boolean
}

function DebugRow({ label, value, mono, small }: DebugRowProps) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`text-text-primary ${mono ? 'font-mono' : ''} ${small ? 'text-[10px]' : ''}`}>
        {value}
      </span>
    </div>
  )
}

interface DebugBarProps {
  percent: number
  color: 'idle' | 'flame' | 'cool'
}

function DebugBar({ percent, color }: DebugBarProps) {
  const colorClasses = {
    idle: 'bg-idle',
    flame: 'bg-flame',
    cool: 'bg-cool',
  }

  return (
    <div className="mt-2 h-1.5 bg-tertiary rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
