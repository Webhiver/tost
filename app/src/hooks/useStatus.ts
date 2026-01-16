import { useState, useEffect, useCallback } from 'react'
import type { Status } from '../types'
import { fetchStatus } from '../api'

export function useStatus(pollInterval = 4000) {
  const [status, setStatus] = useState<Status | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const refresh = useCallback(async () => {
    // Don't refresh while settings are open (to prevent form resets)
    if (settingsOpen && !isLoading) {
      return
    }
    
    try {
      const data = await fetchStatus()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError('Connection failed')
      console.error('Failed to fetch status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [settingsOpen, isLoading])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [refresh, pollInterval])

  const updateLocalStatus = useCallback((updates: Partial<Status>) => {
    setStatus(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  const updateLocalConfig = useCallback((updates: Partial<Status['config']>) => {
    setStatus(prev => prev ? {
      ...prev,
      config: { ...prev.config, ...updates }
    } : null)
  }, [])

  return {
    status,
    isLoading,
    error,
    refresh,
    settingsOpen,
    setSettingsOpen,
    updateLocalStatus,
    updateLocalConfig,
  }
}
