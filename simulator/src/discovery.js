import dgram from 'node:dgram';
import { LOCAL_IP, LOCAL_MAC, LOCAL_BROADCAST } from './network.js';

const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT) || 5005;
const JITTER_MS = 1000;

const iamMessage = () => Buffer.from(`IAM|${LOCAL_MAC}`);

export const startDiscovery = () => {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  socket.on('error', (err) => {
    console.error('Discovery: socket error', err);
    socket.close();
  });

  socket.on('listening', () => {
    socket.setBroadcast(true);
    socket.send(iamMessage(), DISCOVERY_PORT, LOCAL_BROADCAST, (err) => {
      if (err) {
        console.error('Discovery: initial IAM broadcast failed', err);
      } else {
        console.log(`Discovery: sent IAM broadcast from ${LOCAL_IP} to ${LOCAL_BROADCAST}:${DISCOVERY_PORT}`);
      }
    });
  });

  socket.on('message', (data, rinfo) => {
    const message = data.toString('utf8').trim();
    if (message !== 'DISCOVER') return;
    console.log(`Discovery: received DISCOVER from ${rinfo.address}`);
    const jitter = Math.floor(Math.random() * JITTER_MS);
    setTimeout(() => {
      socket.send(iamMessage(), DISCOVERY_PORT, rinfo.address, (err) => {
        if (err) {
          console.error(`Discovery: IAM reply to ${rinfo.address} failed`, err);
        } else {
          console.log(`Discovery: sent IAM from ${LOCAL_IP} to ${rinfo.address}`);
        }
      });
    }, jitter);
  });

  socket.bind(DISCOVERY_PORT, '0.0.0.0', () => {
    console.log(`Discovery: listening on port ${DISCOVERY_PORT}`);
  });

  return socket;
};
