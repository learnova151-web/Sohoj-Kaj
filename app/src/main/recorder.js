const { BrowserWindow } = require('electron');
const path = require('path');

let win = null;

function ensureWindow() {
  if (win && !win.isDestroyed()) return win;
  win = new BrowserWindow({
    show: false,
    width: 10,
    height: 10,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'recorder.html'));
  return win;
}

async function start() {
  const w = ensureWindow();
  if (!w.webContents.isLoading()) {
    w.webContents.send('rec:start');
    return;
  }
  return new Promise(resolve => {
    w.webContents.once('did-finish-load', () => {
      w.webContents.send('rec:start');
      resolve();
    });
  });
}

function stop() {
  if (win && !win.isDestroyed()) win.webContents.send('rec:stop');
}

function isFromRecorder(event) {
  return win && !win.isDestroyed() && event.sender.id === win.webContents.id;
}

module.exports = { start, stop, isFromRecorder };
