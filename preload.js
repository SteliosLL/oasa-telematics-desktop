const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('oasaAPI', {
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  saveFavorites: (favs) => ipcRenderer.invoke('save-favorites', favs)
});