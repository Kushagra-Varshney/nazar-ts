import { networkInterfaces } from 'os';
import { hostname, platform } from 'os';
import { HostInfo } from '../types';

export function getMacAddress(): string {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name];
    if (!netInfo) continue;
    
    for (const net of netInfo) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        return net.mac;
      }
    }
  }
  
  throw new Error('Unable to determine MAC address');
}

export function getHostInfo(): HostInfo {
  const macAddress = getMacAddress();
  
  return {
    id: macAddress.replace(/:/g, ''),
    macAddress,
    hostname: hostname(),
    platform: platform(),
    lastSeen: new Date()
  };
}