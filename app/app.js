/**
 * PicoThermostat Web Application
 * A modern, responsive thermostat interface
 */

const API_BASE = '/api';

// ===== STATE MANAGEMENT =====
const AppState = {
    status: null,
    isPairing: false,
    isLoading: true,
    error: null,
    networks: [],
    selectedNetwork: null,
    settingsOpen: false
};

// ===== API FUNCTIONS =====
async function api(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

async function fetchStatus() {
    if ((AppState.isPairing || AppState.settingsOpen) && !AppState.isLoading) {
        return;
    }
    try {
        AppState.status = await api('/status');
        AppState.isPairing = AppState.status.is_pairing;
        AppState.isLoading = false;
        AppState.error = null;
        render();
    } catch (error) {
        AppState.error = 'Connection failed';
        AppState.isLoading = false;
        render();
    }
}

async function updateConfig(updates) {
    try {
        await api('/config', {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        Object.assign(AppState.status.config, updates);
        render();
    } catch (error) {
        console.error('Failed to update config:', error);
    }
}

async function scanNetworks() {
    try {
        const data = await api('/wifi/scan');
        AppState.networks = data.networks || [];
        render();
    } catch (error) {
        AppState.networks = [];
        render();
    }
}

async function connectWifi(ssid, password) {
    try {
        await api('/wifi/connect', {
            method: 'POST',
            body: JSON.stringify({ ssid, password })
        });
        showMessage('Credentials saved! Device will restart and connect to WiFi.', 'success');
    } catch (error) {
        throw new Error('Failed to save credentials');
    }
}

// ===== UTILITY FUNCTIONS =====
function formatTemp(temp) {
    if (temp === null || temp === undefined) return '--';
    return temp.toFixed(1);
}

function formatHumidity(humidity) {
    if (humidity === null || humidity === undefined) return '--';
    return Math.round(humidity);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'info') {
    alert(text); // Simple alert for now
}

// ===== RENDER FUNCTIONS =====
function render() {
    const root = document.getElementById('root');
    
    if (AppState.isLoading) {
        root.innerHTML = renderLoading();
        return;
    }
    
    if (AppState.isPairing) {
        root.innerHTML = renderPairing();
        return;
    }
    
    if (AppState.status?.config?.mode === 'satellite') {
        root.innerHTML = renderSatellite();
    } else {
        root.innerHTML = renderHost();
    }
}

function renderLoading() {
    return `
        <div class="loading fade-in">
            <div class="loading-spinner"></div>
            <span class="loading-text">Connecting to PicoThermostat...</span>
        </div>
    `;
}

function renderHeader(statusType, statusText) {
    return `
        <header class="header">
            <div class="header__logo">
                <svg class="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"/>
                </svg>
                <h1 class="header__title">PicoThermostat</h1>
            </div>
            <div class="status-badge status-badge--${statusType}">
                <span class="status-dot"></span>
                ${statusText}
            </div>
        </header>
    `;
}

function renderHost() {
    const { status } = AppState;
    const isHeating = status.flame;
    const temp = status.sensor?.temperature;
    const humidity = status.sensor?.humidity;
    const target = status.config?.target_temp || 22;
    const satellites = status.satellites || [];
    
    const onlineCount = satellites.filter(s => s.online).length;
    
    return `
        <div class="container">
            ${renderHeader(isHeating ? 'heating' : 'idle', isHeating ? 'Heating' : 'Idle')}
            
            <div class="temp-display ${isHeating ? 'temp-display--heating' : ''}">
                <div class="current-temp ${isHeating ? 'current-temp--heating' : ''}">
                    ${formatTemp(temp)}<span class="unit">°C</span>
                </div>
                <div class="humidity-display">
                    <svg class="humidity-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
                    </svg>
                    <span>${formatHumidity(humidity)}% humidity</span>
                </div>
            </div>
            
            <div class="target-control">
                <div class="target-label">Target Temperature</div>
                <div class="target-row">
                    <div class="target-temp">${target.toFixed(1)}°C</div>
                    <div class="target-buttons">
                        <button class="target-btn" onclick="adjustTarget(-0.5)">−</button>
                        <button class="target-btn" onclick="adjustTarget(0.5)">+</button>
                    </div>
                </div>
            </div>
            
            ${satellites.length > 0 ? `
            <div class="card">
                <div class="card__header">
                    <span class="card__title">Satellites</span>
                    <span class="card__badge">${onlineCount}/${satellites.length} online</span>
                </div>
                ${satellites.map(sat => `
                    <div class="satellite-item">
                        <div class="satellite-info">
                            <span class="satellite-ip">${escapeHtml(sat.ip)}</span>
                            <span class="satellite-status ${sat.online ? 'satellite-status--online' : ''}">
                                ${sat.online ? '● Online' : '○ Offline'}
                            </span>
                        </div>
                        <span class="satellite-temp ${!sat.online ? 'satellite-temp--offline' : ''}">
                            ${sat.online ? formatTemp(sat.sensor?.temperature) + '°C' : 'No data'}
                        </span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <footer class="footer">
                <p class="footer__text">Flame duration: ${formatDuration(status.flame_duration)}</p>
            </footer>
        </div>
        
        <button class="settings-toggle" onclick="toggleSettings()">⚙</button>
        ${renderSettings()}
    `;
}

function renderSatellite() {
    const { status } = AppState;
    const temp = status.sensor?.temperature;
    const humidity = status.sensor?.humidity;
    
    return `
        <div class="container">
            ${renderHeader('satellite', 'Satellite Mode')}
            
            <div class="temp-display">
                <div class="current-temp">
                    ${formatTemp(temp)}<span class="unit">°C</span>
                </div>
                <div class="humidity-display">
                    <svg class="humidity-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
                    </svg>
                    <span>${formatHumidity(humidity)}% humidity</span>
                </div>
            </div>
            
            <div class="card">
                <p style="text-align: center; color: var(--text-secondary); line-height: 1.6;">
                    This device is operating as a satellite sensor.<br>
                    Temperature data is being sent to the host thermostat.
                </p>
            </div>
            
            <footer class="footer">
                <p class="footer__text">IP: ${AppState.status?.config?.host_ip || 'Unknown'}</p>
            </footer>
        </div>
    `;
}

function renderPairing() {
    if (AppState.selectedNetwork) {
        return renderPasswordForm();
    }
    
    return `
        <div class="pairing-container">
            <div class="pairing-icon">📡</div>
            <h2 class="pairing-title">WiFi Setup</h2>
            <p class="pairing-subtitle">
                Connect your PicoThermostat to a WiFi network to get started
            </p>
            
            <div class="network-list" id="networkList">
                ${AppState.networks.length === 0 ? `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <span class="loading-text">Scanning for networks...</span>
                    </div>
                ` : AppState.networks.map(net => `
                    <div class="network-item" onclick="selectNetwork('${escapeHtml(net.ssid)}')">
                        <span class="network-ssid">${escapeHtml(net.ssid)}</span>
                        <span class="network-signal">${net.rssi} dBm</span>
                    </div>
                `).join('')}
            </div>
            
            <button class="btn btn--secondary" onclick="scanNetworks()">
                Refresh Networks
            </button>
        </div>
    `;
}

function renderPasswordForm() {
    return `
        <div class="pairing-container">
            <div class="pairing-icon">🔐</div>
            <h2 class="pairing-title">${escapeHtml(AppState.selectedNetwork)}</h2>
            <p class="pairing-subtitle">
                Enter the network password to connect
            </p>
            
            <div class="network-list">
                <input 
                    type="password" 
                    id="wifiPassword" 
                    class="input" 
                    placeholder="WiFi Password"
                    autocomplete="current-password"
                >
                
                <div id="connectError" class="error-message" style="display: none;"></div>
                
                <button class="btn btn--primary" onclick="doConnect()">
                    Connect
                </button>
                
                <button class="btn btn--secondary" onclick="clearSelection()">
                    Back to Networks
                </button>
            </div>
        </div>
    `;
}

function renderSettings() {
    if (!AppState.status?.config) return '';
    
    const config = AppState.status.config;
    
    return `
        <div class="settings-panel ${AppState.settingsOpen ? 'settings-panel--open' : ''}" id="settingsPanel">
            <div class="settings-header">
                <h2 class="settings-title">Settings</h2>
                <button class="settings-close" onclick="toggleSettings()">×</button>
            </div>
            
            <div class="settings-content">
                <div class="settings-section">
                    <h3 class="settings-section__title">Temperature Control</h3>
                    
                    <div class="settings-row">
                        <span class="settings-label">Hysteresis</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" 
                                value="${config.hysteresis}" 
                                step="0.1" min="0.1" max="5"
                                onchange="updateSetting('hysteresis', parseFloat(this.value))">
                            <span>°C</span>
                        </div>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Flame On Mode</span>
                        <select class="settings-select" onchange="updateSetting('flame_on_mode', this.value)">
                            <option value="average" ${config.flame_on_mode === 'average' ? 'selected' : ''}>Average</option>
                            <option value="all" ${config.flame_on_mode === 'all' ? 'selected' : ''}>All Sensors</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Flame Off Mode</span>
                        <select class="settings-select" onchange="updateSetting('flame_off_mode', this.value)">
                            <option value="average" ${config.flame_off_mode === 'average' ? 'selected' : ''}>Average</option>
                            <option value="all" ${config.flame_off_mode === 'all' ? 'selected' : ''}>All Sensors</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Local Sensor</span>
                        <select class="settings-select" onchange="updateSetting('local_sensor', this.value)">
                            <option value="included" ${config.local_sensor === 'included' ? 'selected' : ''}>Always Include</option>
                            <option value="fallback" ${config.local_sensor === 'fallback' ? 'selected' : ''}>Fallback Only</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section__title">Timing</h3>
                    
                    <div class="settings-row">
                        <span class="settings-label">Update Interval</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" 
                                value="${config.update_interval}" 
                                step="1" min="1" max="60"
                                onchange="updateSetting('update_interval', parseInt(this.value))">
                            <span>sec</span>
                        </div>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Satellite Grace Period</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" 
                                value="${config.satellite_grace_period}" 
                                step="10" min="30" max="600"
                                onchange="updateSetting('satellite_grace_period', parseInt(this.value))">
                            <span>sec</span>
                        </div>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Max Flame Duration</span>
                        <div class="settings-value">
                            <input type="number" class="settings-input" 
                                value="${Math.round(config.max_flame_duration / 3600)}" 
                                step="1" min="1" max="24"
                                onchange="updateSetting('max_flame_duration', parseInt(this.value) * 3600)">
                            <span>hours</span>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section__title">Display</h3>
                    
                    <div class="settings-row">
                        <span class="settings-label">LED Brightness</span>
                        <div class="settings-value">
                            <input type="range" 
                                value="${config.led_brightness * 100}" 
                                min="0" max="100"
                                style="width: 100px;"
                                onchange="updateSetting('led_brightness', parseInt(this.value) / 100)">
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section__title">Satellites</h3>
                    
                    <div id="satelliteList">
                        ${(config.satellites || []).map((ip, idx) => `
                            <div class="settings-row">
                                <input type="text" class="settings-input" style="width: 140px; text-align: left;"
                                    value="${ip}" 
                                    placeholder="192.168.1.x"
                                    onchange="updateSatelliteIP(${idx}, this.value)">
                                <button class="btn btn--secondary" style="width: auto; margin: 0; padding: 8px 12px;"
                                    onclick="removeSatellite(${idx})">×</button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn btn--secondary" onclick="addSatellite()">
                        + Add Satellite
                    </button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section__title">Device</h3>
                    
                    <div class="settings-row">
                        <span class="settings-label">Mode</span>
                        <select class="settings-select" onchange="updateSetting('mode', this.value)">
                            <option value="host" ${config.mode === 'host' ? 'selected' : ''}>Host</option>
                            <option value="satellite" ${config.mode === 'satellite' ? 'selected' : ''}>Satellite</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== EVENT HANDLERS =====
function adjustTarget(delta) {
    const currentTarget = AppState.status?.config?.target_temp || 22;
    const newTarget = Math.round((currentTarget + delta) * 10) / 10;
    updateConfig({ target_temp: newTarget });
}

function toggleSettings() {
    AppState.settingsOpen = !AppState.settingsOpen;
    render();
}

function updateSetting(key, value) {
    updateConfig({ [key]: value });
}

function selectNetwork(ssid) {
    AppState.selectedNetwork = ssid;
    render();
}

function clearSelection() {
    AppState.selectedNetwork = null;
    render();
}

async function doConnect() {
    const password = document.getElementById('wifiPassword')?.value || '';
    const errorDiv = document.getElementById('connectError');
    
    try {
        await connectWifi(AppState.selectedNetwork, password);
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
}

function addSatellite() {
    const satellites = [...(AppState.status?.config?.satellites || []), ''];
    updateConfig({ satellites });
}

function removeSatellite(index) {
    const satellites = [...(AppState.status?.config?.satellites || [])];
    satellites.splice(index, 1);
    updateConfig({ satellites });
}

function updateSatelliteIP(index, value) {
    const satellites = [...(AppState.status?.config?.satellites || [])];
    satellites[index] = value;
    updateConfig({ satellites });
}

function formatDuration(seconds) {
    if (!seconds || seconds < 60) return 'Not running';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// ===== INITIALIZATION =====
async function init() {
    // Initial fetch
    await fetchStatus();
    
    // If in pairing mode, scan networks
    if (AppState.isPairing) {
        await scanNetworks();
    }
    
    // Poll for updates
    setInterval(fetchStatus, 4000);
}

// Start the app
init();
