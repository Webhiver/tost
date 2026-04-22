import { createServer } from './server.js';
import { startDiscovery } from './discovery.js';

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

createServer().listen(port, host, () => {
  console.log(`Pico Thermostat simulator listening on http://${host}:${port}`);
});

startDiscovery();

// Exit promptly when running as PID 1 under Docker (no default SIGTERM action).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => process.exit(0));
}
