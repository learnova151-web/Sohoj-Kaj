const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sohoj', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: patch => ipcRenderer.invoke('settings:set', patch),
  downloadModel: () => ipcRenderer.invoke('model:download'),
  chooseModelFile: () => ipcRenderer.invoke('model:choose-file'),
  openSettings: () => ipcRenderer.invoke('app:open-settings'),
  openExternal: url => ipcRenderer.invoke('app:open-external', url),
  copyText: text => ipcRenderer.invoke('app:copy', text),
  onModelProgress: cb => ipcRenderer.on('model:progress', (e, payload) => cb(payload)),
  onHudState: cb => ipcRenderer.on('hud:state', (e, payload) => cb(payload)),
  recSend: (chunk, sampleRate) => ipcRenderer.send('rec:chunk', chunk, sampleRate),
  recEnd: () => ipcRenderer.send('rec:end'),
  onRecCommand: cb => {
    ipcRenderer.on('rec:start', () => cb('start'));
    ipcRenderer.on('rec:stop', () => cb('stop'));
  }
});
