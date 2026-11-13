const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, systemPreferences, clipboard, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const store = require('./store');
const recorder = require('./recorder');
const { transcribe } = require('./transcriber');
const { pasteText } = require('./typewriter');
const { downloadModel, modelExists, modelPath } = require('./model-manager');
const { resampleTo16k, writeWav, rms } = require('./wav');
const { APP_NAME, LANGUAGES } = require('../shared/constants');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray = null;
let hud = null;
let settingsWin = null;

const state = {
  phase: 'idle',
  lang: null,
  chunks: [],
  sampleRate: 48000,
  voiceSeen: false,
  lastVoiceAt: 0,
  startedAt: 0,
  result: '',
  maxTimer: null
};

const VOICE_THRESHOLD = 0.006;

function createHud() {
  hud = new BrowserWindow({
    width: 460,
    height: 168,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  hud.loadFile(path.join(__dirname, '..', 'renderer', 'hud.html'));
  hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function positionHud() {
  if (!hud || hud.isDestroyed()) return;
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workArea;
  hud.setPosition(Math.round(width / 2 - 230), Math.round(height - 190));
}

function hudState(payload) {
  if (!hud || hud.isDestroyed()) return;
  hud.webContents.send('hud:state', payload);
  if (payload.phase !== 'idle') {
    positionHud();
    hud.show();
  }
}

function hideHudSoon(delay = 5000) {
  setTimeout(() => {
    if (hud && !hud.isDestroyed() && state.phase !== 'recording' && state.phase !== 'transcribing') {
      hud.hide();
    }
  }, delay);
}

function createSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 720,
    height: 680,
    title: `${APP_NAME} Settings`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWin.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
}

async function startDictation(lang) {
  if (state.phase === 'recording' && state.lang === lang) {
    stopDictation();
    return;
  }
  if (state.phase !== 'idle') return;

  if (process.platform === 'darwin') {
    const ok = await systemPreferences.askForMediaAccess('microphone');
    if (!ok) {
      hudState({ phase: 'error', lang, message: 'Microphone access was denied. Allow it in System Settings and try again.' });
      hideHudSoon();
      return;
    }
  }

  state.phase = 'recording';
  state.lang = lang;
  state.chunks = [];
  state.voiceSeen = false;
  state.lastVoiceAt = Date.now();
  state.startedAt = Date.now();

  hudState({ phase: 'recording', lang });
  await recorder.start();

  const maxMs = store.get().maxSeconds * 1000;
  state.maxTimer = setTimeout(() => {
    if (state.phase === 'recording') stopDictation();
  }, maxMs);
}

function stopDictation() {
  if (state.phase !== 'recording') return;
  clearTimeout(state.maxTimer);
  state.phase = 'transcribing';
  recorder.stop();
  hudState({ phase: 'transcribing', lang: state.lang });
}

ipcMain.on('rec:chunk', (event, chunk, sampleRate) => {
  if (!recorder.isFromRecorder(event)) return;
  if (state.phase !== 'recording') return;
  const data = Float32Array.from(chunk);
  state.sampleRate = sampleRate;
  state.chunks.push(data);

  const level = rms(data);
  if (level > VOICE_THRESHOLD) {
    state.voiceSeen = true;
    state.lastVoiceAt = Date.now();
  }

  const silenceMs = store.get().silenceStopMs;
  if (state.voiceSeen && Date.now() - state.lastVoiceAt > silenceMs) {
    stopDictation();
  }
});

ipcMain.on('rec:end', async event => {
  if (!recorder.isFromRecorder(event)) return;
  if (state.phase !== 'transcribing') return;

  const lang = state.lang;
  const chunks = state.chunks;
  state.chunks = [];

  if (!state.voiceSeen || chunks.length === 0) {
    state.phase = 'idle';
    hudState({ phase: 'error', lang, message: 'Nothing was heard. Press the shortcut, speak, then pause.' });
    hideHudSoon(6000);
    return;
  }

  try {
    const samples = resampleTo16k(chunks, state.sampleRate);
    const wavPath = path.join(os.tmpdir(), `sohoj-kaj-${Date.now()}.wav`);
    writeWav(wavPath, samples, 16000);

    const text = (await transcribe(wavPath, lang)).trim();
    fs.rmSync(wavPath, { force: true });

    state.phase = 'idle';

    if (!text) {
      hudState({ phase: 'error', lang, message: 'No words came out. Try again a little closer to the mic.' });
      hideHudSoon(6000);
      return;
    }

    state.result = text;
    let pasted = false;
    const settings = store.get();
    if (settings.autoPaste) {
      try {
        await pasteText(text);
        pasted = true;
      } catch (err) {
        hudState({ phase: 'error', lang, message: err.userHint || 'Could not paste automatically. Text is on your clipboard.' });
        hideHudSoon(8000);
        return;
      }
    } else {
      clipboard.writeText(text);
    }

    hudState({ phase: 'done', lang, text, pasted });
    hideHudSoon(6000);
  } catch (err) {
    state.phase = 'idle';
    const message =
      err.code === 'no-model'
        ? 'The offline model is not downloaded yet. Open Settings to download it (one time, about 830 MB).'
        : err.code === 'no-key'
          ? 'Add your Google Gemini key in Settings to use Cloud mode.'
          : err.userHint || err.message || 'Transcription failed.';
    hudState({ phase: 'error', lang, message, openSettings: err.code === 'no-model' || err.code === 'no-key' });
    hideHudSoon(9000);
  }
});

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const s = store.get();
  const pairs = [
    [s.banglaShortcut, 'bn'],
    [s.englishShortcut, 'en']
  ];
  for (const [acc, lang] of pairs) {
    if (!acc) continue;
    try {
      globalShortcut.register(acc, () => startDictation(lang));
    } catch {
      /* invalid accelerator: ignore */
    }
  }
}

function settingsChangedShortcuts(patch) {
  return patch && ('banglaShortcut' in patch || 'englishShortcut' in patch);
}

function createTray() {
  const buildDir = path.join(__dirname, '..', '..', 'build');
  const iconPath = path.join(buildDir, 'tray.png');
  const fallback = path.join(buildDir, 'icon.png');
  tray = new Tray(fs.existsSync(iconPath) ? iconPath : fallback);
  const s = store.get();
  const menu = Menu.buildFromTemplate([
    { label: `Dictate ${LANGUAGES.bn.label} (${s.banglaShortcut})`, click: () => startDictation('bn') },
    { label: `Dictate ${LANGUAGES.en.label} (${s.englishShortcut})`, click: () => startDictation('en') },
    { type: 'separator' },
    { label: 'Settings', click: createSettingsWindow },
    { type: 'separator' },
    { label: `Quit ${APP_NAME}`, click: () => app.quit() }
  ]);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(menu);
}

ipcMain.handle('settings:get', () => ({
  settings: store.get(),
  model: { exists: modelExists(), path: modelPath() }
}));

ipcMain.handle('settings:set', (event, patch) => {
  const next = store.set(patch || {});
  if (settingsChangedShortcuts(patch)) registerShortcuts();
  return next;
});

ipcMain.handle('model:download', async () => {
  try {
    const dest = await downloadModel();
    return { ok: true, dest };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('model:choose-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(settingsWin, {
    title: 'Choose a whisper model file (.ggml or .gguf)',
    filters: [{ name: 'Whisper models', extensions: ['gguf', 'ggml', 'bin'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths[0]) return null;
  store.set({ modelPath: filePaths[0] });
  return filePaths[0];
});

ipcMain.handle('app:open-settings', () => {
  createSettingsWindow();
  return true;
});

ipcMain.handle('app:open-external', (event, url) => {
  if (typeof url === 'string' && url.startsWith('https://')) shell.openExternal(url);
  return true;
});

ipcMain.handle('app:copy', (event, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});

app.whenReady().then(() => {
  createHud();
  createTray();
  registerShortcuts();

  app.on('second-instance', () => {
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createHud();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', e => {
  if (process.platform !== 'darwin') app.quit();
});
