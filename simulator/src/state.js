import { VERSION } from './version.js';
import { LOCAL_IP, LOCAL_MAC } from './network.js';

const initialState = () => ({
  is_pairing: false,
  wifi_connected: true,
  wifi_strength: 4,
  mac: LOCAL_MAC,
  ip: LOCAL_IP,
  firmware_version: VERSION,
  sensor: {
    temperature: 22.5,
    humidity: 45.0,
    healthy: true,
    message: '',
  },
  flame: false,
  flame_start_tick: null,
  flame_cooldown_start_tick: null,
  flame_duration: 0,
  satellites: [],
  effective_temperature: null,
});

const state = { ...initialState() };

export const getState = () => ({ ...state, sensor: { ...state.sensor } });

export const getStateKey = (key) => state[key];

export const setStateKey = (key, value) => {
  state[key] = value;
};

export const patchStateKey = (key, updates) => {
  const current = state[key];
  if (current && typeof current === 'object' && !Array.isArray(current)
      && updates && typeof updates === 'object' && !Array.isArray(updates)) {
    state[key] = { ...current, ...updates };
  } else {
    state[key] = updates;
  }
};

export const getSatelliteState = () => ({
  sensor: { ...state.sensor },
  wifi_strength: state.wifi_strength,
  firmware_version: state.firmware_version,
});
