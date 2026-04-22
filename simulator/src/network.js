import os from 'node:os';

const pickInterface = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        return iface;
      }
    }
  }
  return null;
};

const iface = pickInterface();

export const LOCAL_IP = iface ? iface.address : '127.0.0.1';
export const LOCAL_MAC = iface ? iface.mac.toLowerCase() : '00:00:00:00:00:00';
