const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStorage', {
  getAll: () => ipcRenderer.invoke('storage:getAll'),
  setItem: (key, value) => ipcRenderer.invoke('storage:setItem', key, value),
  removeItem: (key) => ipcRenderer.invoke('storage:removeItem', key),
  getDataPath: () => ipcRenderer.invoke('storage:getDataPath'),
});
