import { useState, useEffect, useCallback, useRef } from 'react'
import type { Status, State, Config } from '../types'
import { fetchStatus } from '../api'

export function useStatus(pollInterval = 4000) {
  const [status, setStatus] = useState<Status | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // Track the current abort controller and interval
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cancel any in-flight status request
  const cancelPendingFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const refresh = useCallback(async () => {
    // Don't refresh while settings are open (to prevent form resets)
    if (settingsOpen && !isLoading) {
      return
    }
    
    // Cancel any existing request before starting a new one
    cancelPendingFetch()
    
    // Create new abort controller for this request
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    try {
      const data = await fetchStatus(controller.signal)
      // Only update state if this request wasn't aborted
      if (!controller.signal.aborted) {
        setStatus(data)
        setError(null)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError('Connection failed')
      console.error('Failed to fetch status:', err)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
      // Clear the ref if this controller is still the current one
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [settingsOpen, isLoading, cancelPendingFetch])

  // Start/restart the polling interval
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(refresh, pollInterval)
  }, [refresh, pollInterval])

  // Refresh and reset the polling interval (use after config updates)
  const refreshAndResetInterval = useCallback(async () => {
    cancelPendingFetch()
    await refresh()
    startPolling()
  }, [cancelPendingFetch, refresh, startPolling])

  useEffect(() => {
    refresh()
    startPolling()
    return () => {
      cancelPendingFetch()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refresh, startPolling, cancelPendingFetch])

  const updateLocalState = useCallback((updates: Partial<State>) => {
    setStatus(prev => prev ? {
      ...prev,
      state: { ...prev.state, ...updates }
    } : null)
  }, [])

  const updateLocalConfig = useCallback((updates: Partial<Config>) => {
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
    updateLocalState,
    updateLocalConfig,
    cancelPendingFetch,
    refreshAndResetInterval,
  }
}
