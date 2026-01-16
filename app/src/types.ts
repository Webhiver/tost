export interface SensorData {
  temperature: number | null
  humidity: number | null
}

export interface Satellite {
  ip: string
  sensor: SensorData
  last_updated: number
  online: boolean
}

export interface Config {
  mode: 'host' | 'satellite'
  target_temp: number
  hysteresis: number
  satellites: string[]
  host_ip: string
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
