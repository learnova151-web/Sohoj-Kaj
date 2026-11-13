const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { app, BrowserWindow } = require('electron');
const { MODEL_URL, MODEL_NAME, MODEL_SIZE_BYTES } = require('../shared/constants');

function modelsDir() {
  return path.join(app.getPath('userData'), 'models');
}

function bundledModelPath() {
  const bundled = path.join(process.resourcesPath || '', 'whisper', MODEL_NAME);
  if (fs.existsSync(bundled)) return bundled;
  return null;
}

function modelPath() {
  const settings = require('./store').get();
  if (settings.modelPath && fs.existsSync(settings.modelPath)) return settings.modelPath;
  const inUserData = path.join(modelsDir(), MODEL_NAME);
  if (fs.existsSync(inUserData)) return inUserData;
  return bundledModelPath();
}

function modelExists() {
  const p = modelPath();
  return Boolean(p && fs.existsSync(p) && fs.statSync(p).size > 100 * 1024 * 1024);
}

function sendProgress(payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('model:progress', payload);
  }
}

async function downloadModel() {
  fs.mkdirSync(modelsDir(), { recursive: true });
  const dest = path.join(modelsDir(), MODEL_NAME);
  const partial = dest + '.part';

  let startByte = 0;
  if (fs.existsSync(partial)) startByte = fs.statSync(partial).size;

  const headers = {};
  if (startByte > 0) headers.Range = `bytes=${startByte}-`;

  const res = await fetch(MODEL_URL, { headers });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Model download failed (HTTP ${res.status})`);
  }
  if (res.status === 200 && startByte > 0) {
    fs.rmSync(partial, { force: true });
    startByte = 0;
  }

  const total = Number(res.headers.get('content-length') || 0) + startByte || MODEL_SIZE_BYTES;
  let received = startByte;
  let lastPct = -1;

  const nodeStream = Readable.fromWeb(res.body);
  nodeStream.on('data', chunk => {
    received += chunk.length;
    const pct = Math.floor((received / total) * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      sendProgress({ status: 'downloading', pct, received, total });
    }
  });

  const out = fs.createWriteStream(partial, startByte > 0 ? { flags: 'a' } : {});
  await pipeline(nodeStream, out);
  fs.renameSync(partial, dest);
  sendProgress({ status: 'done', pct: 100 });
  return dest;
}

module.exports = { downloadModel, modelExists, modelPath, modelsDir };
