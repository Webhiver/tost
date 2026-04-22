import { createServer } from './server.js';

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

createServer().listen(port, host, () => {
  console.log(`Pico Thermostat simulator listening on http://${host}:${port}`);
});
