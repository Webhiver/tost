export interface SensorData {
  temperature: number | null
  humidity: number | null
  healthy: boolean
  message: string
}

export interface SatelliteConfig {
  ip: string
  name: string
}

export interface Satellite {
  ip: string
  name: string
  sensor: SensorData
  last_updated: number
  online: boolean
}

export interface Config {
  mode: 'host' | 'satellite'
  target_temp: number
  hysteresis: number
  satellites: SatelliteConfig[]
  satellite_grace_period: number
  led_brightness: number
  flame_on_mode: 'average' | 'all'
  flame_off_mode: 'average' | 'all'
  local_sensor: 'included' | 'fallback'
  max_flame_duration: number
  sensor_temperature_offset: number
  sensor_humidity_offset: number
}

export interface State {
  is_pairing: boolean
  wifi_connected: boolean
  wifi_strength: number | null
  sensor: SensorData
  flame: boolean
  flame_start_tick: number | null
  flame_duration: number
  satellites: Satellite[]
}

export interface Status {
  state: State
  config: Config
}

export interface Network {
  ssid: string
  rssi: number
}

export interface DebugInfo {
  memory: {
    free_bytes: number
    allocated_bytes: number
    total_bytes: number
    free_kb: number
    percent_used: number
  }
  cpu: {
    frequency_hz: number
    frequency_mhz: number
  }
  uptime: {
    milliseconds: number
    seconds: number
    formatted: string
  }
  internal_temp_c: number | null
  flash: {
    total_bytes: number | null
    free_bytes: number | null
    used_bytes: number | null
    total_kb: number | null
    free_kb: number | null
    percent_used: number | null
  }
  system: {
    sysname: string
    nodename: string
    release: string
    version: string
    machine: string
  } | null
  network: {
    ip: string
    subnet: string
    gateway: string
    dns: string
    rssi: number | null
  } | null
}
