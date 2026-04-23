const DEFAULT_CONFIG = {
  mode: 'satellite',
  name: '',
  operating_mode: 'manual',
  target_temperature: 22.0,
  hysteresis: 1.0,
  min_temp: 10,
  max_temp: 30,
  scale_precision: 0.5,
  satellites: [],
  satellite_grace_period: 120,
  led_brightness: 1.0,
  flame_mode: 'average',
  flame_mode_sensor: 'local',
  local_sensor: 'included',
  max_flame_duration: 14400,
  flame_cooldown: 1800,
  sensor_temperature_offset: 0.0,
  sensor_humidity_offset: 0.0,
  relay_enabled: false,
  simulator: true,
};

let config = { ...DEFAULT_CONFIG };

export const getConfig = () => ({ ...config });

export const getConfigKey = (key) => config[key];

export const setConfig = (newConfig) => {
  config = { ...newConfig };
};

export const patchConfig = (updates) => {
  config = { ...config, ...updates };
};
