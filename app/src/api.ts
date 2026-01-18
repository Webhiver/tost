import type { Status, Config, Network, DebugInfo } from './types'

const API_BASE = '/api'

async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_BASE + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchStatus(): Promise<Status> {
  return api<Status>('/status')
}

export async function fetchConfig(): Promise<Config> {
  return api<Config>('/config')
}

export async function updateConfig(updates: Partial<Config>): Promise<{ status: string; config: Config }> {
  return api<{ status: string; config: Config }>('/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function setConfig(config: Config): Promise<{ status: string; config: Config }> {
  return api<{ status: string; config: Config }>('/config', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function scanNetworks(): Promise<{ networks: Network[] }> {
  return api<{ networks: Network[] }>('/wifi/scan')
}

export async function connectWifi(ssid: string, password: string): Promise<{ status: string; message: string }> {
  return api<{ status: string; message: string }>('/wifi/connect', {
    method: 'POST',
    body: JSON.stringify({ ssid, password }),
  })
}

export async function exitPairing(): Promise<{ status: string; message: string }> {
  return api<{ status: string; message: string }>('/pairing/exit', {
    method: 'POST',
  })
}

// Satellite proxy functions
export async function fetchSatelliteConfig(ip: string): Promise<Config> {
  return api<Config>(`/satellite-proxy/${ip}/config`)
}

export async function updateSatelliteConfig(ip: string, updates: Partial<Config>): Promise<{ status: string; config: Config }> {
  return api<{ status: string; config: Config }>(`/satellite-proxy/${ip}/config`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function fetchDebug(): Promise<DebugInfo> {
  return api<DebugInfo>('/debug')
}
