import os from 'node:os';
import process from 'node:process';
import { LOCAL_IP } from './network.js';

const bootTimeMs = Date.now();

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

export const getDebugInfo = () => {
  const mem = process.memoryUsage();
  const memFree = os.freemem();
  const memTotal = os.totalmem();
  const uptimeMs = Date.now() - bootTimeMs;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  const cpus = os.cpus();
  const cpuFreqHz = cpus[0] ? cpus[0].speed * 1_000_000 : 0;

  return {
    memory: {
      free_bytes: mem.heapTotal - mem.heapUsed,
      allocated_bytes: mem.heapUsed,
      total_bytes: mem.heapTotal,
      free_kb: Math.round(((mem.heapTotal - mem.heapUsed) / 1024) * 10) / 10,
      percent_used: Math.round((mem.heapUsed / mem.heapTotal) * 1000) / 10,
    },
    cpu: {
      frequency_hz: cpuFreqHz,
      frequency_mhz: Math.floor(cpuFreqHz / 1_000_000),
    },
    uptime: {
      milliseconds: uptimeMs,
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    internal_temp_c: null,
    flash: {
      total_bytes: memTotal,
      free_bytes: memFree,
      used_bytes: memTotal - memFree,
      total_kb: Math.round((memTotal / 1024) * 10) / 10,
      free_kb: Math.round((memFree / 1024) * 10) / 10,
      percent_used: Math.round(((memTotal - memFree) / memTotal) * 1000) / 10,
    },
    system: {
      sysname: os.type(),
      nodename: os.hostname(),
      release: os.release(),
      version: process.version,
      machine: os.arch(),
    },
    network: {
      ip: LOCAL_IP,
      subnet: '255.255.255.0',
      gateway: '127.0.0.1',
      dns: '127.0.0.1',
      rssi: -55,
    },
  };
};
