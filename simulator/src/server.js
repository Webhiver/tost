import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getState, getSatelliteState, patchStateKey } from './state.js';
import { getConfig, getConfigKey, setConfig, patchConfig } from './config.js';
import { getDebugInfo } from './debug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_HTML = fs.readFileSync(path.join(__dirname, 'ui', 'index.html'), 'utf8');

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const limit = 16 * 1024;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const sendJson = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const sendText = (res, status, body, contentType) => {
  const buf = Buffer.from(body);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': buf.length,
  });
  res.end(buf);
};

const routes = [
  {
    method: 'GET',
    path: '/',
    handler: () => ({ status: 200, body: UI_HTML, contentType: 'text/html; charset=utf-8' }),
  },
  {
    method: 'GET',
    path: '/api/status',
    handler: () => ({ status: 200, body: { state: getState(), config: getConfig() } }),
  },
  {
    method: 'GET',
    path: '/api/state',
    handler: () => {
      const body = getConfigKey('mode') === 'satellite' ? getSatelliteState() : getState();
      return { status: 200, body };
    },
  },
  {
    method: 'GET',
    path: '/api/config',
    handler: () => ({ status: 200, body: getConfig() }),
  },
  {
    method: 'POST',
    path: '/api/config',
    handler: async (req) => {
      const data = await readJsonBody(req);
      if (!data) return { status: 400, body: { error: 'No config provided' } };
      setConfig(data);
      return { status: 200, body: { status: 'ok', config: getConfig() } };
    },
  },
  {
    method: 'PATCH',
    path: '/api/config',
    handler: async (req) => {
      const data = await readJsonBody(req);
      if (!data) return { status: 400, body: { error: 'No updates provided' } };
      patchConfig(data);
      return { status: 200, body: { status: 'ok', config: getConfig() } };
    },
  },
  {
    method: 'GET',
    path: '/api/debug',
    handler: () => ({ status: 200, body: getDebugInfo() }),
  },
  {
    method: 'POST',
    path: '/api/sync',
    handler: async (req) => {
      if (getConfigKey('mode') !== 'satellite') {
        return { status: 403, body: { error: 'Sync only available in satellite mode' } };
      }
      const data = await readJsonBody(req);
      if (data && 'flame' in data) patchStateKey('flame', data.flame);
      if (data && 'target_temperature' in data) patchConfig({ target_temperature: data.target_temperature });
      if (data && 'operating_mode' in data) patchConfig({ operating_mode: data.operating_mode });
      return { status: 200, body: { status: 'ok' } };
    },
  },
  {
    method: 'POST',
    path: '/api/simulator/state/sensor',
    handler: async (req) => {
      const data = await readJsonBody(req);
      if (!data || typeof data !== 'object') {
        return { status: 400, body: { error: 'Sensor payload required' } };
      }
      patchStateKey('sensor', data);
      return { status: 200, body: { status: 'ok', sensor: getState().sensor } };
    },
  },
  {
    method: 'PATCH',
    path: '/api/simulator/state/sensor',
    handler: async (req) => {
      const data = await readJsonBody(req);
      if (!data || typeof data !== 'object') {
        return { status: 400, body: { error: 'Sensor updates required' } };
      }
      const current = getState().sensor;
      patchStateKey('sensor', { ...current, ...data });
      return { status: 200, body: { status: 'ok', sensor: getState().sensor } };
    },
  },
  {
    method: 'GET',
    path: '/api/ping',
    handler: () => ({ status: 200, body: { status: 'ok' } }),
  },
];

export const createServer = () =>
  http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const route = routes.find((r) => r.method === req.method && r.path === url.pathname);

    if (!route) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    try {
      const result = await route.handler(req);
      if (result.contentType) {
        sendText(res, result.status, result.body, result.contentType);
      } else {
        sendJson(res, result.status, result.body);
      }
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
  });
