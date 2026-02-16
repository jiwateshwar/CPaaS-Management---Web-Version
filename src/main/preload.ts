import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannelMap, IpcChannel } from '../shared/ipc-channels';
import type { ProgressData, BatchCompleteEvent } from '../shared/types';

const electronAPI = {
  invoke: <C extends IpcChannel>(
    channel: C,
    params: IpcChannelMap[C]['params'],
  ): Promise<IpcChannelMap[C]['result']> => {
    return ipcRenderer.invoke(channel, params);
  },

  onProgress: (callback: (event: ProgressData) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: ProgressData) =>
      callback(data);
    ipcRenderer.on('batch:progress', handler);
    return () => ipcRenderer.removeListener('batch:progress', handler);
  },

  onBatchComplete: (callback: (event: BatchCompleteEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: BatchCompleteEvent) =>
      callback(data);
    ipcRenderer.on('batch:complete', handler);
    return () => ipcRenderer.removeListener('batch:complete', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer process
export type ElectronAPI = typeof electronAPI;
