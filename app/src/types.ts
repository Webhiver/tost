export interface SensorData {
  temperature: number | null
  humidity: number | null
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
  update_interval: number
  satellite_grace_period: number
  led_brightness: number
  flame_on_mode: 'average' | 'all'
  flame_off_mode: 'average' | 'all'
  local_sensor: 'included' | 'fallback'
  max_flame_duration: number
}

export interface Status {
  config: Config
  is_pairing: boolean
  sensor: SensorData
  flame: boolean
  flame_start_tick: number | null
  flame_duration: number
  satellites: Satellite[]
}

export interface Network {
  ssid: string
  rssi: number
}
