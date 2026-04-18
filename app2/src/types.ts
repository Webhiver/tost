export interface SensorData {
  temperature: number | null
  humidity: number | null
  healthy: boolean
  message: string
}

export interface SatelliteConfig {
  mac: string
  name: string
}

export interface SatelliteState {
  sensor: SensorData
  wifi_strength: number | null
  firmware_version: string | null
}

export interface Satellite {
  mac: string
  ip: string
  state: SatelliteState | null
  last_updated: number
  online: boolean
}

export type FlameMode = 'average' | 'all' | 'any' | 'one'
export type OperatingMode = 'off' | 'manual' | "schedule"

export interface Config {
  mode: 'host' | 'satellite'
  relay_enabled: boolean
  mac: 'string'
  name: string
  operating_mode: OperatingMode
  target_temperature: number
  hysteresis: number
  min_temp: number
  max_temp: number
  scale_precision: number
  satellites: SatelliteConfig[]
  satellite_grace_period: number
  led_brightness: number
  flame_mode: FlameMode
  flame_mode_sensor: string  // 'local' or satellite MAC
  local_sensor: 'included' | 'fallback'
  max_flame_duration: number
  flame_cooldown: number
  sensor_temperature_offset: number
  sensor_humidity_offset: number
}

export interface Configs {
  [key: string]: Config | undefined
}

export interface PendingConfigs {
  [key: string]: Partial<Config> | undefined
}

export interface State {
  is_pairing: boolean
  mac: string,
  ip: string,
  firmware_version: string | null,
  wifi_connected: boolean
  wifi_strength: number | null
  sensor: SensorData
  flame: boolean
  flame_start_tick: number | null
  flame_duration: number
  satellites: Satellite[]
  effective_temperature: number | null
}

export interface Status {
  state: State
  config: Config
}

export interface Network {
  ssid: string
  rssi: number
  strength: number
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

export interface DebugInfoExtended {
  device: Device
  data: DebugInfo,
  lastUpdates: Date | null
}

export interface AllDebugInfo {
  [key: string]: DebugInfoExtended
}

// APP2 Types

export interface Device {
  id: string
  ip: string | undefined
  firmwareVersion: string | null
  satellite: boolean
  name: string
  online: boolean
  healthy: boolean
  error: string | null
  wifiStrength: number | null
  temperature: number | null
  humidity: number | null
  active: boolean
}

export type Theme = 'light' | 'dark' | undefined

export type Language = 'en' | 'ro'

export interface LocalProviderProps {
  theme: 'light' | 'dark' | undefined
  language: Language
  type: 'host' | 'satellite'
  mode: string
  flame: boolean
  flameMode: string
  flameModeSensor: string | null
  flameDuration: number
  isPairing: boolean
  mac: string
  ip: string
  firmwareVersion: string | null
  name: string
  healthy: boolean
  temperature: number | null
  humidity: number | null
  wifiConnected: boolean
  wifiStrength: number | null
  knobSize: number
  knobWidth: number
  knobAngleRange: number
  knobAngleOffset: number
  knobMinTemp: number
  knobMaxTemp: number
  knobScalePrecision: number
  knobTickWidth: number
  knobTickHeight: number
  knobSteps: number
  knobPercentage: number
  targetTemp: number
  effectiveTemp: number
  satellites: Satellite[]
  devices: Device[]
  setMode: (mode: OperatingMode) => void
  setTargetTemp: (temp: number) => void
  setKnobPercentage: (percentage: number) => void
  toggleTheme: (theme: Theme) => void
  changeLanguage: (language: Language) => void
}

export interface ApiProviderProps {
  isLoading: boolean
  isFetching: boolean
  config: Config | null
  state: State | null
  submitConfig: (config: Partial<Config>) => void;
  startGettingStatus: () => void
  stopGettingStatus: () => void
  resetAndStartGettingStatus: () => void
  cancelPendingGetStatus: () => void
  cancelPendingSubmitConfig: () => void
  onConfigsUpdated: (configs: Partial<Config>) => void
}

export interface DeviceError {
  [key: string]: string;
}

export interface PanelProviderErrors {
  [key: string]: DeviceError;
}

export type PanelType = 'main' | 'settings' | 'schedule' | 'satellites' | 'statistics' | 'monitoring' | 'updates'

export interface PanelsProviderProps {
  loading: boolean
  saving: boolean
  saveResult: 'success' | 'error' | null
  validationErrors: PanelProviderErrors,
  panelsAnimationSpeed: number
  mainPanelOpen: boolean
  settingsPanelOpen: boolean
  schedulePanelOpen: boolean
  satellitesPanelOpen: boolean
  statisticsPanelOpen: boolean
  monitoringPanelOpen: boolean
  updatesPanelOpen: boolean
  configs: Configs
  togglePanel: (panel: PanelType, isOpen: boolean) => void
  onConfigChange: (key: keyof Config, value: Config[keyof Config], mac: string) => void
  onSatelliteConfigChange: (index: number, key: keyof SatelliteConfig, value: SatelliteConfig[keyof SatelliteConfig]) => void
  onAddSatellite: () => void
  onRemoveSatellite: (index: number) => void
  onReboot: (ip?: string) => void
  toggleLoading: (isLoading: boolean) => void
}