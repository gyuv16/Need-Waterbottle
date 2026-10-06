import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('waterBuddy', { platform: process.platform });
